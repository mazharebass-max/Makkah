import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus, LocationShareRole } from "@prisma/client";
import { RoleCode } from "@haramain/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { AvailabilityService } from "./availability.service";
import { assertTransition, canTransition } from "./booking-state.machine";
import { OwnershipService } from "../ownership/ownership.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { RequestUser } from "../auth/auth.types";

const LIVE_LOCATION_STATUSES: BookingStatus[] = [
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
];

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
        invoices: { orderBy: { createdAt: "desc" }, take: 5, include: { lines: true } },
      },
    });
    if (!booking || booking.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }
    const snap = (booking.priceSnapshot ?? {}) as Record<string, unknown>;
    return {
      ...booking,
      tripExtras: {
        contactName: typeof snap.contactName === "string" ? snap.contactName : null,
        contactPhone: typeof snap.contactPhone === "string" ? snap.contactPhone : null,
        specialInstructions:
          typeof snap.specialInstructions === "string" ? snap.specialInstructions : null,
        flightNumber: typeof snap.flightNumber === "string" ? snap.flightNumber : null,
        pickupPointCode: typeof snap.pickupPointCode === "string" ? snap.pickupPointCode : null,
        pickupPointName: typeof snap.pickupPointName === "string" ? snap.pickupPointName : null,
      },
      invoices: booking.invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        totalHalalas: inv.totalHalalas,
        currency: inv.currency,
        status: inv.status,
        draftLabel: inv.draftLabel,
        issuedAt: inv.issuedAt?.toISOString() ?? null,
        lineCount: inv.lines.length,
      })),
      tripTimeline: booking.statusEvents.map((e) => ({
        from: e.fromStatus,
        to: e.toStatus,
        at: e.createdAt.toISOString(),
        note: e.note,
      })),
    };
  }

  private async resolveShareRole(
    user: RequestUser,
    bookingId: string,
    requested?: LocationShareRole | string,
  ): Promise<{ role: LocationShareRole; driverId: string | null }> {
    await this.ownership.assertBookingAccess(user, bookingId);
    const wantsCustomer =
      requested === LocationShareRole.CUSTOMER || requested === "CUSTOMER";
    const wantsDriver = requested === LocationShareRole.DRIVER || requested === "DRIVER";

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }

    const isCustomerOwner = booking.customerId === user.id;
    const preferCustomer =
      wantsCustomer || (!wantsDriver && isCustomerOwner && !this.ownership.hasAnyRole(user, [RoleCode.DRIVER]));

    if (preferCustomer) {
      if (!isCustomerOwner) {
        throw new BadRequestException({
          code: "NOT_CUSTOMER",
          message: "Only the booking customer can share customer location",
        });
      }
      return { role: LocationShareRole.CUSTOMER, driverId: null };
    }

    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) {
      throw new NotFoundException({ code: "NO_DRIVER", message: "Driver profile required" });
    }
    const assignment = await this.prisma.bookingAssignment.findUnique({ where: { bookingId } });
    if (!assignment || assignment.driverId !== driver.id) {
      throw new BadRequestException({
        code: "NOT_ASSIGNED",
        message: "Location sharing only for your assigned trip",
      });
    }
    return { role: LocationShareRole.DRIVER, driverId: driver.id };
  }

  async grantLocationConsent(
    user: RequestUser,
    bookingId: string,
    requestedRole?: LocationShareRole | string,
  ) {
    const { role, driverId } = await this.resolveShareRole(user, bookingId, requestedRole);
    const consent = await this.prisma.locationConsent.upsert({
      where: {
        bookingId_role_userId: { bookingId, role, userId: user.id },
      },
      create: {
        bookingId,
        role,
        driverId,
        userId: user.id,
        purpose:
          role === LocationShareRole.CUSTOMER
            ? "customer_trip_location"
            : "active_trip_tracking",
      },
      update: { revokedAt: null, grantedAt: new Date(), driverId },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "location.consent.grant",
        resource: "booking",
        resourceId: bookingId,
        metadata: { purpose: consent.purpose, role },
      },
    });
    return {
      bookingId,
      role,
      consented: true,
      purpose: consent.purpose,
      message: "Location sharing enabled for this active trip only",
      liveTracking: false as const,
    };
  }

  async revokeLocationConsent(
    user: RequestUser,
    bookingId: string,
    requestedRole?: LocationShareRole | string,
  ) {
    const { role } = await this.resolveShareRole(user, bookingId, requestedRole);
    await this.prisma.locationConsent.updateMany({
      where: { bookingId, role, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { bookingId, role, consented: false };
  }

  async postLocationSample(
    user: RequestUser,
    bookingId: string,
    input: {
      latitude: number;
      longitude: number;
      accuracyM?: number;
      role?: LocationShareRole | string;
    },
  ) {
    const { role, driverId } = await this.resolveShareRole(user, bookingId, input.role);
    const consent = await this.prisma.locationConsent.findUnique({
      where: {
        bookingId_role_userId: { bookingId, role, userId: user.id },
      },
    });
    if (!consent || consent.revokedAt) {
      throw new BadRequestException({
        code: "CONSENT_REQUIRED",
        message: "Explicit location consent required before sharing",
      });
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    if (!LIVE_LOCATION_STATUSES.includes(booking.status)) {
      throw new BadRequestException({
        code: "TRIP_NOT_ACTIVE",
        message: "Location samples only during active trip states",
      });
    }
    const sample = await this.prisma.locationSample.create({
      data: {
        bookingId,
        role,
        driverId,
        userId: user.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyM: input.accuracyM,
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
    });
    return {
      id: sample.id,
      role,
      recordedAt: sample.recordedAt.toISOString(),
      expiresAt: sample.expiresAt.toISOString(),
      retentionNote: "Sample expires within 24h — precise location minimized per PDPL",
      liveTracking: false as const,
    };
  }

  async latestLocation(user: RequestUser, bookingId: string) {
    await this.ownership.assertBookingAccess(user, bookingId);
    const [driverSample, customerSample] = await Promise.all([
      this.prisma.locationSample.findFirst({
        where: {
          bookingId,
          role: LocationShareRole.DRIVER,
          expiresAt: { gt: new Date() },
        },
        orderBy: { recordedAt: "desc" },
      }),
      this.prisma.locationSample.findFirst({
        where: {
          bookingId,
          role: LocationShareRole.CUSTOMER,
          expiresAt: { gt: new Date() },
        },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    const mapSample = (
      sample: {
        latitude: number;
        longitude: number;
        accuracyM: number | null;
        recordedAt: Date;
        role: LocationShareRole;
        userId: string;
      } | null,
    ) =>
      sample
        ? {
            role: sample.role,
            latitude: sample.latitude,
            longitude: sample.longitude,
            accuracyM: sample.accuracyM,
            recordedAt: sample.recordedAt.toISOString(),
            userId: sample.userId,
          }
        : null;

    const driver = mapSample(driverSample);
    const customer = mapSample(customerSample);
    return {
      bookingId,
      /** @deprecated Prefer `driver` — kept for mobile smoke / older clients */
      sample: driver,
      driver,
      customer,
      liveTracking: false as const,
      message:
        driver || customer
          ? undefined
          : "No active consented location samples",
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
