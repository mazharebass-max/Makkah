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
import type { RequestUser } from "../auth/auth.types";

@Injectable()
export class BookingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
    @Inject(OwnershipService) private readonly ownership: OwnershipService,
  ) {}

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
    return booking;
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
