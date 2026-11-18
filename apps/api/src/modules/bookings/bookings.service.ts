import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AvailabilityService } from "./availability.service";
import { assertTransition, canTransition } from "./booking-state.machine";
import { OwnershipService } from "../ownership/ownership.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { RequestUser } from "../auth/auth.types";

@Injectable()
export class BookingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
    @Inject(OwnershipService) private readonly ownership: OwnershipService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async listMine(user: RequestUser) {
    const bookings = await this.prisma.booking.findMany({
      where: { customerId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        route: true,
        category: true,
        assignment: { select: { vehicleId: true, driverId: true, startsAt: true, endsAt: true } },
      },
    });
    return {
      data: bookings.map((b) => this.tripSummary(b)),
      source: "database" as const,
      inventedAvailability: false as const,
    };
  }

  async listDriverTrips(user: RequestUser) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) {
      throw new NotFoundException({ code: "NO_DRIVER", message: "No driver profile for user" });
    }
    const assignments = await this.prisma.bookingAssignment.findMany({
      where: { driverId: driver.id },
      include: {
        booking: {
          include: { route: true, category: true },
        },
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });
    return {
      driverId: driver.id,
      data: assignments.map((a) => ({
        ...this.tripSummary(a.booking),
        assignment: {
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt.toISOString(),
          vehicleId: a.vehicleId,
        },
      })),
    };
  }

  async getBooking(user: RequestUser, id: string) {
    await this.ownership.assertBookingAccess(user, id);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        route: true,
        category: true,
        assignment: true,
        statusEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!booking || booking.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }
    return {
      ...booking,
      tripTimeline: booking.statusEvents.map((e) => ({
        from: e.fromStatus,
        to: e.toStatus,
        at: e.createdAt.toISOString(),
        note: e.note,
      })),
    };
  }

  async grantLocationConsent(user: RequestUser, bookingId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) {
      throw new NotFoundException({ code: "NO_DRIVER", message: "Driver profile required" });
    }
    await this.ownership.assertBookingAccess(user, bookingId);
    const assignment = await this.prisma.bookingAssignment.findUnique({ where: { bookingId } });
    if (!assignment || assignment.driverId !== driver.id) {
      throw new BadRequestException({
        code: "NOT_ASSIGNED",
        message: "Location sharing only for your assigned trip",
      });
    }
    const consent = await this.prisma.locationConsent.upsert({
      where: { bookingId_driverId: { bookingId, driverId: driver.id } },
      create: { bookingId, driverId: driver.id, purpose: "active_trip_tracking" },
      update: { revokedAt: null, grantedAt: new Date() },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "location.consent.grant",
        resource: "booking",
        resourceId: bookingId,
        metadata: { purpose: consent.purpose },
      },
    });
    return {
      bookingId,
      consented: true,
      purpose: consent.purpose,
      message: "Location sharing enabled for this active trip only",
    };
  }

  async revokeLocationConsent(user: RequestUser, bookingId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) {
      throw new NotFoundException({ code: "NO_DRIVER", message: "Driver profile required" });
    }
    await this.prisma.locationConsent.updateMany({
      where: { bookingId, driverId: driver.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { bookingId, consented: false };
  }

  async postLocationSample(
    user: RequestUser,
    bookingId: string,
    input: { latitude: number; longitude: number; accuracyM?: number },
  ) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) {
      throw new NotFoundException({ code: "NO_DRIVER", message: "Driver profile required" });
    }
    const consent = await this.prisma.locationConsent.findUnique({
      where: { bookingId_driverId: { bookingId, driverId: driver.id } },
    });
    if (!consent || consent.revokedAt) {
      throw new BadRequestException({
        code: "CONSENT_REQUIRED",
        message: "Explicit location consent required before sharing",
      });
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    const active: BookingStatus[] = [
      BookingStatus.ASSIGNED,
      BookingStatus.DRIVER_EN_ROUTE,
      BookingStatus.ARRIVED,
      BookingStatus.IN_PROGRESS,
    ];
    if (!active.includes(booking.status)) {
      throw new BadRequestException({
        code: "TRIP_NOT_ACTIVE",
        message: "Location samples only during active trip states",
      });
    }
    const sample = await this.prisma.locationSample.create({
      data: {
        bookingId,
        driverId: driver.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyM: input.accuracyM,
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
    });
    return {
      id: sample.id,
      recordedAt: sample.recordedAt.toISOString(),
      expiresAt: sample.expiresAt.toISOString(),
      retentionNote: "Sample expires within 24h — precise location minimized per PDPL",
    };
  }

  async latestLocation(user: RequestUser, bookingId: string) {
    await this.ownership.assertBookingAccess(user, bookingId);
    const sample = await this.prisma.locationSample.findFirst({
      where: { bookingId, expiresAt: { gt: new Date() } },
      orderBy: { recordedAt: "desc" },
    });
    if (!sample) {
      return { bookingId, sample: null, message: "No active consented location sample" };
    }
    return {
      bookingId,
      sample: {
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracyM: sample.accuracyM,
        recordedAt: sample.recordedAt.toISOString(),
      },
    };
  }

  private tripSummary(b: {
    id: string;
    reference: string;
    status: BookingStatus;
    scheduledAt: Date;
    totalHalalas: number;
    currency: string;
    passengerCount: number;
    route?: { code: string; nameEn: string; nameAr?: string | null } | null;
    category?: { code: string; nameEn: string; nameAr?: string | null } | null;
    assignment?: {
      vehicleId?: string | null;
      driverId?: string | null;
      startsAt?: Date;
      endsAt?: Date;
    } | null;
  }) {
    return {
      id: b.id,
      /** Alias clarifying Booking is the trip domain object (no separate Trip table yet). */
      tripId: b.id,
      reference: b.reference,
      status: b.status,
      scheduledAt: b.scheduledAt.toISOString(),
      totalHalalas: b.totalHalalas,
      currency: b.currency,
      passengers: b.passengerCount,
      route: b.route
        ? { code: b.route.code, nameEn: b.route.nameEn, nameAr: b.route.nameAr ?? null }
        : null,
      category: b.category
        ? {
            code: b.category.code,
            nameEn: b.category.nameEn,
            nameAr: b.category.nameAr ?? null,
          }
        : null,
      assignment: b.assignment
        ? {
            vehicleId: b.assignment.vehicleId ?? null,
            driverId: b.assignment.driverId ?? null,
            startsAt: b.assignment.startsAt?.toISOString() ?? null,
            endsAt: b.assignment.endsAt?.toISOString() ?? null,
          }
        : null,
      liveAvailabilityClaim: false as const,
    };
  }

  async transition(input: {
    user: RequestUser;
    bookingId: string;
    toStatus: BookingStatus;
    note?: string;
  }) {
    await this.ownership.assertBookingAccess(input.user, input.bookingId);
    const booking = await this.prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking || booking.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }
    if (!canTransition(booking.status, input.toStatus)) {
      throw new BadRequestException({
        code: "ILLEGAL_TRANSITION",
        message: `Cannot transition ${booking.status} → ${input.toStatus}`,
      });
    }
    assertTransition(booking.status, input.toStatus);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.booking.update({
        where: { id: booking.id },
        data: { status: input.toStatus },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: input.toStatus,
          actorId: input.user.id,
          note: input.note,
        },
      });
      return next;
    });

    const customer = await this.prisma.user.findUnique({ where: { id: booking.customerId } });
    await this.notifications.enqueue("notification.booking_status", {
      userId: booking.customerId,
      bookingId: booking.id,
      toEmail: customer?.email,
      templateCode: "booking_status",
      vars: { reference: updated.reference, status: updated.status },
      dedupeKey: `booking_status:${booking.id}:${updated.status}:${Date.now()}`,
    });

    return {
      id: updated.id,
      reference: updated.reference,
      status: updated.status,
      fromStatus: booking.status,
    };
  }

  /**
   * Sandbox-only payment confirmation — never claims live gateway success.
   * PENDING_PAYMENT → CONFIRMED → ASSIGNMENT_PENDING
   */
  async confirmSandboxPayment(user: RequestUser, bookingId: string) {
    await this.ownership.assertBookingAccess(user, bookingId);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        code: "INVALID_STATUS",
        message: "Booking is not awaiting payment",
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      assertTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED);
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING_PAYMENT,
          toStatus: BookingStatus.CONFIRMED,
          actorId: user.id,
          note: "Sandbox payment confirmed — not a live capture",
        },
      });
      assertTransition(BookingStatus.CONFIRMED, BookingStatus.ASSIGNMENT_PENDING);
      const next = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.ASSIGNMENT_PENDING },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          fromStatus: BookingStatus.CONFIRMED,
          toStatus: BookingStatus.ASSIGNMENT_PENDING,
          actorId: user.id,
          note: "Queued for dispatch",
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          action: "payments.sandbox.confirm",
          resource: "booking",
          resourceId: booking.id,
          metadata: { mode: "sandbox" },
        },
      });
      return next;
    });

    return {
      mode: "sandbox" as const,
      message: "Sandbox payment recorded — not a live gateway success",
      booking: {
        id: result.id,
        reference: result.reference,
        status: result.status,
      },
    };
  }

  async cancel(user: RequestUser, bookingId: string, note?: string) {
    const booking = await this.getBooking(user, bookingId);
    const to =
      booking.status === BookingStatus.PENDING_PAYMENT ||
      booking.status === BookingStatus.QUOTED ||
      booking.status === BookingStatus.DRAFT
        ? BookingStatus.CANCELLED
        : canTransition(booking.status, BookingStatus.CANCEL_REQUESTED)
          ? BookingStatus.CANCEL_REQUESTED
          : null;
    if (!to) {
      throw new BadRequestException({
        code: "NOT_CANCELLABLE",
        message: `Cannot cancel from ${booking.status}`,
      });
    }
    const updated = await this.transition({
      user,
      bookingId,
      toStatus: to,
      note: note ?? "Customer/staff cancel",
    });
    await this.prisma.availabilityHold.updateMany({
      where: { bookingId, releasedAt: null },
      data: { releasedAt: new Date() },
    });
    return updated;
  }
}
