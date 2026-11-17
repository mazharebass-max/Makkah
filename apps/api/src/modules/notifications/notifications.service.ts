import { Inject, Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SandboxService } from "../sandbox/sandbox.service";

export type NotifyPayload = {
  userId?: string;
  bookingId?: string;
  toEmail?: string;
  toPhone?: string;
  locale?: string;
  templateCode: string;
  vars?: Record<string, string>;
  dedupeKey: string;
};

const TEMPLATES: Record<
  string,
  { channel: NotificationChannel; subjectEn: string; bodyEn: string; bodyAr: string }
> = {
  otp_email: {
    channel: NotificationChannel.EMAIL,
    subjectEn: "Your Haramain Ride verification code",
    bodyEn: "Your sandbox OTP is {{code}}. Not a live SMS/email delivery.",
    bodyAr: "رمز التحقق التجريبي هو {{code}}. ليست رسالة حقيقية.",
  },
  booking_created: {
    channel: NotificationChannel.EMAIL,
    subjectEn: "Booking draft {{reference}}",
    bodyEn: "Booking {{reference}} created (PENDING_PAYMENT). Sandbox notice only.",
    bodyAr: "تم إنشاء الحجز {{reference}} (بانتظار الدفع). إشعار تجريبي فقط.",
  },
  booking_confirmed: {
    channel: NotificationChannel.EMAIL,
    subjectEn: "Booking confirmed {{reference}}",
    bodyEn: "Booking {{reference}} confirmed via sandbox payment webhook.",
    bodyAr: "تم تأكيد الحجز {{reference}} عبر بوابة الدفع التجريبية.",
  },
  driver_assigned: {
    channel: NotificationChannel.EMAIL,
    subjectEn: "Driver assigned for {{reference}}",
    bodyEn: "A driver was assigned to booking {{reference}}. Sandbox notice only.",
    bodyAr: "تم تعيين سائق للحجز {{reference}}. إشعار تجريبي فقط.",
  },
  booking_status: {
    channel: NotificationChannel.EMAIL,
    subjectEn: "Trip update {{reference}}: {{status}}",
    bodyEn: "Booking {{reference}} is now {{status}}.",
    bodyAr: "الحجز {{reference}} أصبح {{status}}.",
  },
};

function render(template: string, vars: Record<string, string> = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SandboxService) private readonly sandbox: SandboxService,
  ) {}

  async ensureTemplates() {
    for (const [code, t] of Object.entries(TEMPLATES)) {
      await this.prisma.notificationTemplate.upsert({
        where: { code },
        update: {
          channel: t.channel,
          subjectEn: t.subjectEn,
          bodyEn: t.bodyEn,
          bodyAr: t.bodyAr,
        },
        create: {
          code,
          channel: t.channel,
          subjectEn: t.subjectEn,
          bodyEn: t.bodyEn,
          bodyAr: t.bodyAr,
        },
      });
    }
  }

  /** Enqueue outbox row (call inside or after domain tx). Deduped by dedupeKey at send time. */
  async enqueue(type: string, payload: NotifyPayload) {
    return this.prisma.outboxEvent.create({
      data: {
        type,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async enqueueOtp(input: { userId?: string; email: string; code: string }) {
    const dedupeKey = `otp:${input.email}:${input.code}`;
    await this.enqueue("notification.otp", {
      userId: input.userId,
      toEmail: input.email,
      templateCode: "otp_email",
      vars: { code: input.code },
      dedupeKey,
    });
    return {
      mode: "sandbox" as const,
      message: "OTP queued to outbox — sandbox channel only, not a live delivery",
      liveDelivery: false,
    };
  }

  async processOutbox(limit = 50) {
    await this.ensureTemplates();
    const pending = await this.prisma.outboxEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let processed = 0;
    let sent = 0;
    let skipped = 0;

    for (const event of pending) {
      try {
        const payload = event.payload as unknown as NotifyPayload;
        const result = await this.deliver(payload);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date(), attempts: { increment: 1 }, lastError: null },
        });
        processed += 1;
        if (result === "sent") sent += 1;
        else skipped += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { attempts: { increment: 1 }, lastError: message.slice(0, 500) },
        });
      }
    }

    return {
      mode: "sandbox" as const,
      processed,
      sent,
      skipped,
      remaining: await this.prisma.outboxEvent.count({ where: { processedAt: null } }),
      liveDelivery: false,
    };
  }

  private async deliver(payload: NotifyPayload): Promise<"sent" | "skipped"> {
    const existing = await this.prisma.notification.findUnique({
      where: { dedupeKey: payload.dedupeKey },
    });
    if (existing) return "skipped";

    const tmpl =
      (await this.prisma.notificationTemplate.findUnique({
        where: { code: payload.templateCode },
      })) ?? null;
    const fallback = TEMPLATES[payload.templateCode];
    const channel = tmpl?.channel ?? fallback?.channel ?? NotificationChannel.EMAIL;
    const subjectSrc = tmpl?.subjectEn ?? fallback?.subjectEn ?? payload.templateCode;
    const bodySrc =
      payload.locale === "ar"
        ? tmpl?.bodyAr ?? fallback?.bodyAr ?? fallback?.bodyEn ?? ""
        : tmpl?.bodyEn ?? fallback?.bodyEn ?? "";
    const subject = render(subjectSrc, payload.vars);
    const body = render(bodySrc, payload.vars);
    const to =
      channel === NotificationChannel.SMS
        ? payload.toPhone ?? "unknown"
        : payload.toEmail ?? "unknown";

    let sandboxRef: string | undefined;
    if (channel === NotificationChannel.SMS) {
      sandboxRef = this.sandbox.sendSms(to, body).reference;
    } else {
      sandboxRef = this.sandbox.sendEmail(to, subject).reference;
    }

    await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        channel,
        templateCode: payload.templateCode,
        toAddress: to,
        subject,
        body,
        status: NotificationStatus.SENT_SANDBOX,
        dedupeKey: payload.dedupeKey,
        sandboxRef,
        bookingId: payload.bookingId,
        payload: payload as unknown as Prisma.InputJsonValue,
        sentAt: new Date(),
      },
    });
    return "sent";
  }

  async listMine(userId: string) {
    const data = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      mode: "sandbox" as const,
      data: data.map((n) => ({
        id: n.id,
        templateCode: n.templateCode,
        channel: n.channel,
        subject: n.subject,
        status: n.status,
        bookingId: n.bookingId,
        createdAt: n.createdAt.toISOString(),
        liveDelivery: false,
      })),
    };
  }

  async adminQueue() {
    const [outbox, recent] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { processedAt: null } }),
      this.prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);
    return {
      mode: "sandbox" as const,
      pendingOutbox: outbox,
      recent: recent.map((n) => ({
        id: n.id,
        templateCode: n.templateCode,
        status: n.status,
        toAddress: n.toAddress,
        createdAt: n.createdAt.toISOString(),
      })),
      liveDelivery: false,
    };
  }
}
