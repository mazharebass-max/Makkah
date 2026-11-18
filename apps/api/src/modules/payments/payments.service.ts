import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  BookingStatus,
  ChargeStatus,
  InvoiceStatus,
  LedgerEntryType,
  PaymentIntentStatus,
  Prisma,
  RefundStatus,
} from "@prisma/client";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { RoleCode } from "@haramain/contracts";
import { loadEnv } from "../../config/env";
import { PrismaService } from "../../prisma/prisma.service";
import { OwnershipService } from "../ownership/ownership.service";
import type { RequestUser } from "../auth/auth.types";
import { assertTransition } from "../bookings/booking-state.machine";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OwnershipService) private readonly ownership: OwnershipService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  /**
   * Create sandbox checkout for a booking — never a live capture.
   */
  async createCheckout(user: RequestUser, input: { bookingId: string; idempotencyKey?: string }) {
    await this.ownership.assertBookingAccess(user, input.bookingId);
    const booking = await this.prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking || booking.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        code: "INVALID_STATUS",
        message: `Checkout only for PENDING_PAYMENT (got ${booking.status})`,
      });
    }

    const idempotencyKey = input.idempotencyKey ?? `checkout:${booking.id}:${user.id}`;
    const existing = await this.prisma.paymentIntent.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return this.checkoutResponse(existing);
    }

    const intent = await this.prisma.paymentIntent.create({
      data: {
        bookingId: booking.id,
        amountHalalas: booking.totalHalalas,
        currency: booking.currency,
        status: PaymentIntentStatus.REQUIRES_PAYMENT,
        sandboxRef: `pay_sandbox_${randomUUID()}`,
        idempotencyKey,
        mode: "sandbox",
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "payments.checkout.create",
        resource: "payment_intent",
        resourceId: intent.id,
        metadata: { mode: "sandbox", liveCapture: false },
      },
    });

    return this.checkoutResponse(intent);
  }

  /**
   * Authenticated sandbox completion for browser checkout.
   * Applies the same ledger path as a signed webhook without exposing the webhook secret to clients.
   * Always liveCapture: false. Refuses when live payments are enabled or go-live is unlocked incorrectly.
   */
  async completeSandboxCheckout(
    user: RequestUser,
    input: { bookingId: string },
  ) {
    const env = loadEnv();
    if (env.ALLOW_LIVE_PAYMENTS || !env.GO_LIVE_LOCKED) {
      throw new BadRequestException({
        code: "SANDBOX_COMPLETE_DISABLED",
        message:
          "Sandbox simulate-complete is disabled when live payment flags are not locked — use signed webhooks only",
      });
    }

    await this.ownership.assertBookingAccess(user, input.bookingId);
    const intent = await this.prisma.paymentIntent.findFirst({
      where: { bookingId: input.bookingId, mode: "sandbox" },
      orderBy: { createdAt: "desc" },
    });
    if (!intent || !intent.sandboxRef) {
      throw new NotFoundException({
        code: "INTENT_NOT_FOUND",
        message: "No sandbox payment intent for booking — create checkout first",
      });
    }

    const event = {
      gatewayEventId: `evt_sandbox_ui_${intent.id}`,
      type: "payment.succeeded",
      sandboxRef: intent.sandboxRef,
      amountHalalas: intent.amountHalalas,
    };

    const result = await this.handleWebhook(event);

    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "payments.sandbox.complete",
        resource: "payment_intent",
        resourceId: intent.id,
        metadata: { mode: "sandbox", liveCapture: false, bookingId: input.bookingId },
      },
    });

    return {
      ...result,
      mode: "sandbox" as const,
      liveCapture: false as const,
      bookingId: input.bookingId,
      paymentIntentId: intent.id,
      sandboxRef: intent.sandboxRef,
      message:
        "Sandbox checkout completed via authenticated simulate — not a live gateway capture",
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined) {
    const secret = loadEnv().PAYMENT_WEBHOOK_SECRET;
    if (!signatureHeader) {
      throw new UnauthorizedException({ code: "MISSING_SIGNATURE", message: "Webhook signature required" });
    }
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const provided = signatureHeader.replace(/^sha256=/i, "").trim();
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException({ code: "INVALID_SIGNATURE", message: "Webhook signature invalid" });
    }
  }

  /**
   * Idempotent sandbox webhook handler. Dedupes on gatewayEventId.
   * Never claims live gateway success.
   */
  async handleWebhook(input: {
    gatewayEventId: string;
    type: string;
    sandboxRef: string;
    amountHalalas?: number;
  }) {
    const prior = await this.prisma.paymentEvent.findUnique({
      where: { gatewayEventId: input.gatewayEventId },
    });
    if (prior) {
      return {
        ok: true,
        mode: "sandbox" as const,
        duplicate: true,
        message: "Webhook already processed — idempotent no-op",
        eventId: prior.id,
      };
    }

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { sandboxRef: input.sandboxRef },
      include: { charges: true, booking: true },
    });
    if (!intent) {
      throw new NotFoundException({
        code: "INTENT_NOT_FOUND",
        message: "No sandbox payment intent for reference",
      });
    }

    if (input.type === "payment.succeeded") {
      return this.processCapture(intent, input);
    }
    if (input.type === "payment.failed") {
      return this.processFailure(intent, input);
    }
    if (input.type === "refund.succeeded") {
      return this.processRefundWebhook(intent, input);
    }

    await this.prisma.paymentEvent.create({
      data: {
        gatewayEventId: input.gatewayEventId,
        intentId: intent.id,
        type: input.type,
        payload: input as unknown as Prisma.InputJsonValue,
      },
    });
    return {
      ok: true,
      mode: "sandbox" as const,
      duplicate: false,
      message: `Unhandled sandbox event type ${input.type} recorded`,
    };
  }

  private async processCapture(
    intent: {
      id: string;
      bookingId: string;
      amountHalalas: number;
      currency: string;
      status: PaymentIntentStatus;
      sandboxRef: string;
      charges: { id: string }[];
      booking: {
        id: string;
        customerId: string;
        status: BookingStatus;
        reference: string;
        totalHalalas: number;
        currency: string;
        priceSnapshot: unknown;
      };
    },
    input: { gatewayEventId: string; type: string; sandboxRef: string; amountHalalas?: number },
  ) {
    if (intent.charges.length > 0 || intent.status === PaymentIntentStatus.SUCCEEDED) {
      // Out-of-order / retry after success — record event if new id already checked
      await this.prisma.paymentEvent.create({
        data: {
          gatewayEventId: input.gatewayEventId,
          intentId: intent.id,
          type: input.type,
          payload: { ...input, note: "already_captured" },
        },
      });
      return {
        ok: true,
        mode: "sandbox" as const,
        duplicate: false,
        alreadyCaptured: true,
        message: "Sandbox capture already recorded — no double charge",
      };
    }

    const amount = input.amountHalalas ?? intent.amountHalalas;
    if (amount !== intent.amountHalalas) {
      throw new BadRequestException({
        code: "AMOUNT_MISMATCH",
        message: "Webhook amount does not match intent",
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          gatewayEventId: input.gatewayEventId,
          intentId: intent.id,
          type: input.type,
          payload: input as unknown as Prisma.InputJsonValue,
        },
      });

      const charge = await tx.charge.create({
        data: {
          intentId: intent.id,
          amountHalalas: amount,
          currency: intent.currency,
          status: ChargeStatus.CAPTURED,
          sandboxRef: `chg_sandbox_${randomUUID()}`,
        },
      });

      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: PaymentIntentStatus.SUCCEEDED },
      });

      await tx.ledgerEntry.create({
        data: {
          bookingId: intent.bookingId,
          paymentIntentId: intent.id,
          type: LedgerEntryType.CHARGE,
          amountHalalas: amount,
          currency: intent.currency,
          note: "Sandbox capture — not a live gateway settlement",
        },
      });

      const invoiceNumber = `INV-SBX-${intent.booking.reference.replace(/[^A-Z0-9]/gi, "")}-${Date.now().toString(36).toUpperCase()}`;
      const snapshot = intent.booking.priceSnapshot as { lines?: { label: string; amountHalalas: number }[] } | null;
      const lines =
        snapshot?.lines?.length
          ? snapshot.lines
          : [{ label: "Trip fare (sandbox)", amountHalalas: amount }];

      const invoice = await tx.invoice.create({
        data: {
          bookingId: intent.bookingId,
          number: invoiceNumber,
          currency: intent.currency,
          totalHalalas: amount,
          status: InvoiceStatus.ISSUED,
          issuedAt: new Date(),
          draftLabel: "DRAFT — OWNER APPROVAL REQUIRED — sandbox invoice only",
          lines: {
            create: lines.map((l) => ({
              label: l.label,
              amountHalalas: l.amountHalalas,
            })),
          },
        },
        include: { lines: true },
      });

      // Booking: PENDING_PAYMENT → CONFIRMED → ASSIGNMENT_PENDING
      if (intent.booking.status === BookingStatus.PENDING_PAYMENT) {
        assertTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED);
        await tx.booking.update({
          where: { id: intent.bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });
        await tx.bookingStatusEvent.create({
          data: {
            bookingId: intent.bookingId,
            fromStatus: BookingStatus.PENDING_PAYMENT,
            toStatus: BookingStatus.CONFIRMED,
            note: "Sandbox webhook payment.succeeded — not live capture",
          },
        });
        assertTransition(BookingStatus.CONFIRMED, BookingStatus.ASSIGNMENT_PENDING);
        await tx.booking.update({
          where: { id: intent.bookingId },
          data: { status: BookingStatus.ASSIGNMENT_PENDING },
        });
        await tx.bookingStatusEvent.create({
          data: {
            bookingId: intent.bookingId,
            fromStatus: BookingStatus.CONFIRMED,
            toStatus: BookingStatus.ASSIGNMENT_PENDING,
            note: "Queued for dispatch after sandbox payment",
          },
        });
      }

      return { charge, invoice };
    });

    const customer = await this.prisma.user.findUnique({
      where: { id: intent.booking.customerId },
    });
    await this.notifications.enqueue("notification.booking_confirmed", {
      userId: intent.booking.customerId,
      bookingId: intent.bookingId,
      toEmail: customer?.email,
      templateCode: "booking_confirmed",
      vars: { reference: intent.booking.reference },
      dedupeKey: `booking_confirmed:${intent.bookingId}`,
    });

    return {
      ok: true,
      mode: "sandbox" as const,
      duplicate: false,
      liveCapture: false,
      message: "Sandbox payment recorded and ledger/invoice updated — not a live gateway success",
      chargeId: result.charge.id,
      invoiceNumber: result.invoice.number,
      bookingId: intent.bookingId,
    };
  }

  private async processFailure(
    intent: { id: string; bookingId: string; booking: { status: BookingStatus } },
    input: { gatewayEventId: string; type: string },
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          gatewayEventId: input.gatewayEventId,
          intentId: intent.id,
          type: input.type,
          payload: input as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: PaymentIntentStatus.FAILED },
      });
      if (intent.booking.status === BookingStatus.PENDING_PAYMENT) {
        assertTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.PAYMENT_FAILED);
        await tx.booking.update({
          where: { id: intent.bookingId },
          data: { status: BookingStatus.PAYMENT_FAILED },
        });
        await tx.bookingStatusEvent.create({
          data: {
            bookingId: intent.bookingId,
            fromStatus: BookingStatus.PENDING_PAYMENT,
            toStatus: BookingStatus.PAYMENT_FAILED,
            note: "Sandbox payment.failed",
          },
        });
      }
    });
    return {
      ok: true,
      mode: "sandbox" as const,
      message: "Sandbox payment failure recorded",
      bookingId: intent.bookingId,
    };
  }

  private async processRefundWebhook(
    intent: { id: string; bookingId: string },
    input: { gatewayEventId: string; type: string; amountHalalas?: number },
  ) {
    const refund = await this.prisma.refund.findFirst({
      where: { bookingId: intent.bookingId, status: RefundStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
    if (!refund) {
      throw new BadRequestException({
        code: "NO_PENDING_REFUND",
        message: "No pending refund to confirm",
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          gatewayEventId: input.gatewayEventId,
          intentId: intent.id,
          type: input.type,
          payload: input as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.SUCCEEDED },
      });
      await tx.ledgerEntry.create({
        data: {
          bookingId: intent.bookingId,
          refundId: refund.id,
          paymentIntentId: intent.id,
          type: LedgerEntryType.REFUND,
          amountHalalas: -Math.abs(refund.amountHalalas),
          currency: refund.currency,
          note: "Sandbox refund.succeeded — not a live PSP refund",
        },
      });
      const booking = await tx.booking.findUniqueOrThrow({ where: { id: intent.bookingId } });
      let current = booking.status;
      if (
        current === BookingStatus.CANCELLED ||
        current === BookingStatus.COMPLETED ||
        current === BookingStatus.NO_SHOW
      ) {
        assertTransition(current, BookingStatus.REFUND_PENDING);
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.REFUND_PENDING },
        });
        await tx.bookingStatusEvent.create({
          data: {
            bookingId: booking.id,
            fromStatus: current,
            toStatus: BookingStatus.REFUND_PENDING,
            note: "Sandbox refund pending confirmation applied",
          },
        });
        current = BookingStatus.REFUND_PENDING;
      }
      if (current === BookingStatus.REFUND_PENDING) {
        assertTransition(BookingStatus.REFUND_PENDING, BookingStatus.REFUNDED);
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.REFUNDED },
        });
        await tx.bookingStatusEvent.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.REFUND_PENDING,
            toStatus: BookingStatus.REFUNDED,
            note: "Sandbox refund completed",
          },
        });
      }
    });
    return {
      ok: true,
      mode: "sandbox" as const,
      message: "Sandbox refund applied to ledger — not a live gateway refund",
      refundId: refund.id,
    };
  }

  async requestRefund(
    user: RequestUser,
    input: { bookingId: string; amountHalalas?: number; reason?: string },
  ) {
    const isFinance = this.ownership.hasAnyRole(user, [
      RoleCode.FINANCE_OFFICER,
      RoleCode.SUPER_ADMIN,
      RoleCode.SUPPORT_AGENT,
    ]);
    if (!isFinance) {
      await this.ownership.assertBookingAccess(user, input.bookingId);
    }

    const intent = await this.prisma.paymentIntent.findFirst({
      where: { bookingId: input.bookingId, status: PaymentIntentStatus.SUCCEEDED },
      include: { charges: true },
      orderBy: { createdAt: "desc" },
    });
    const charge = intent?.charges[0];
    if (!intent || !charge) {
      throw new BadRequestException({
        code: "NO_CAPTURE",
        message: "No sandbox capture found to refund",
      });
    }
    const existingRefunds = await this.prisma.refund.aggregate({
      where: { chargeId: charge.id, status: { in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED] } },
      _sum: { amountHalalas: true },
    });
    const already = existingRefunds._sum.amountHalalas ?? 0;
    const amount = input.amountHalalas ?? charge.amountHalalas - already;
    if (amount <= 0 || already + amount > charge.amountHalalas) {
      throw new BadRequestException({
        code: "INVALID_REFUND_AMOUNT",
        message: "Refund exceeds captured amount",
      });
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: {
          chargeId: charge.id,
          bookingId: input.bookingId,
          amountHalalas: amount,
          currency: charge.currency,
          status: RefundStatus.PENDING,
          reason: input.reason ?? "Customer/staff refund request",
          sandboxRef: `ref_sandbox_${randomUUID()}`,
          mode: "sandbox",
        },
      });
      const booking = await tx.booking.findUniqueOrThrow({ where: { id: input.bookingId } });
      if (booking.status !== BookingStatus.REFUND_PENDING && booking.status !== BookingStatus.REFUNDED) {
        // Prefer CANCELLED → REFUND_PENDING or COMPLETED → REFUND_PENDING
        const candidates: BookingStatus[] = [
          BookingStatus.CANCELLED,
          BookingStatus.COMPLETED,
          BookingStatus.NO_SHOW,
          BookingStatus.ASSIGNMENT_PENDING,
          BookingStatus.ASSIGNED,
          BookingStatus.CONFIRMED,
        ];
        if (candidates.includes(booking.status)) {
          // Use cancel path then refund pending when needed
          let from = booking.status;
          if (
            from === BookingStatus.ASSIGNMENT_PENDING ||
            from === BookingStatus.ASSIGNED ||
            from === BookingStatus.CONFIRMED
          ) {
            assertTransition(from, BookingStatus.CANCEL_REQUESTED);
            await tx.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.CANCEL_REQUESTED },
            });
            await tx.bookingStatusEvent.create({
              data: {
                bookingId: booking.id,
                fromStatus: from,
                toStatus: BookingStatus.CANCEL_REQUESTED,
                actorId: user.id,
                note: "Refund requested",
              },
            });
            from = BookingStatus.CANCEL_REQUESTED;
            assertTransition(BookingStatus.CANCEL_REQUESTED, BookingStatus.REFUND_PENDING);
          } else {
            assertTransition(from, BookingStatus.REFUND_PENDING);
          }
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.REFUND_PENDING },
          });
          await tx.bookingStatusEvent.create({
            data: {
              bookingId: booking.id,
              fromStatus: from,
              toStatus: BookingStatus.REFUND_PENDING,
              actorId: user.id,
              note: input.reason ?? "Refund pending sandbox confirmation",
            },
          });
        }
      }
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          action: "payments.refund.request",
          resource: "refund",
          resourceId: r.id,
          metadata: { mode: "sandbox", amountHalalas: amount },
        },
      });
      return r;
    });

    return {
      mode: "sandbox" as const,
      message: "Refund pending — confirm via sandbox refund.succeeded webhook (not live PSP)",
      refund: {
        id: refund.id,
        sandboxRef: refund.sandboxRef,
        amountHalalas: refund.amountHalalas,
        status: refund.status,
      },
    };
  }

  async reconciliation() {
    const [charges, refunds, intents, invoices] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { type: LedgerEntryType.CHARGE },
        _sum: { amountHalalas: true },
        _count: true,
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { type: LedgerEntryType.REFUND },
        _sum: { amountHalalas: true },
        _count: true,
      }),
      this.prisma.paymentIntent.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amountHalalas: true },
      }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.ISSUED } }),
    ]);

    const capturedHalalas = charges._sum.amountHalalas ?? 0;
    const refundedHalalas = Math.abs(refunds._sum.amountHalalas ?? 0);
    return {
      mode: "sandbox" as const,
      message: "Ledger reconciliation from sandbox events only — no live gateway claims",
      currency: "SAR",
      totals: {
        capturedHalalas,
        refundedHalalas,
        netHalalas: capturedHalalas - refundedHalalas,
        chargeEntries: charges._count,
        refundEntries: refunds._count,
        issuedInvoices: invoices,
      },
      intentsByStatus: intents.map((i) => ({
        status: i.status,
        count: i._count,
        amountHalalas: i._sum.amountHalalas ?? 0,
      })),
      liveGateway: false,
    };
  }

  async listInvoices() {
    const invoices = await this.prisma.invoice.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { lines: true, booking: { select: { reference: true, status: true } } },
    });
    return {
      mode: "sandbox" as const,
      data: invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        totalHalalas: inv.totalHalalas,
        currency: inv.currency,
        status: inv.status,
        draftLabel: inv.draftLabel,
        bookingReference: inv.booking.reference,
        bookingStatus: inv.booking.status,
        issuedAt: inv.issuedAt?.toISOString() ?? null,
        lines: inv.lines,
      })),
    };
  }

  async getInvoice(user: RequestUser, id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lines: true, booking: true },
    });
    if (!invoice) throw new NotFoundException({ code: "NOT_FOUND", message: "Invoice not found" });
    const isFinance = this.ownership.hasAnyRole(user, [
      RoleCode.FINANCE_OFFICER,
      RoleCode.SUPER_ADMIN,
    ]);
    if (!isFinance) {
      await this.ownership.assertBookingAccess(user, invoice.bookingId);
    }
    return {
      mode: "sandbox" as const,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        totalHalalas: invoice.totalHalalas,
        currency: invoice.currency,
        status: invoice.status,
        draftLabel: invoice.draftLabel,
        lines: invoice.lines,
        bookingId: invoice.bookingId,
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
      },
      zatcaNote: "ZATCA e-invoicing not enabled — DRAFT only",
    };
  }

  private checkoutResponse(intent: {
    id: string;
    sandboxRef: string;
    amountHalalas: number;
    currency: string;
    status: PaymentIntentStatus;
    bookingId: string;
  }) {
    return {
      ok: true,
      mode: "sandbox" as const,
      message: "Sandbox checkout session created — not a live capture",
      liveCapture: false,
      paymentIntent: {
        id: intent.id,
        sandboxRef: intent.sandboxRef,
        amountHalalas: intent.amountHalalas,
        currency: intent.currency,
        status: intent.status,
        bookingId: intent.bookingId,
      },
      webhookHint: {
        path: "/api/v1/webhooks/payments/sandbox",
        header: "X-Haramain-Signature: sha256=<hmac>",
        sampleEvent: "payment.succeeded",
      },
    };
  }
}
