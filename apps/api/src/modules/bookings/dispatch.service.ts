import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus, FleetOwnership, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AvailabilityService } from "./availability.service";
import { assertTransition } from "./booking-state.machine";

const TRIP_DURATION_MS = 3 * 60 * 60 * 1000;

@Injectable()
export class DispatchService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
  ) {}

  /**
   * Concurrency-safe assignment using serializable tx + advisory lock + overlap checks.
   * Exclusion constraint in DB is an additional safety net.
   */
  async assignBooking(input: {
    bookingId: string;
    actorId: string;
    vehicleId?: string;
    driverId?: string;
    reason?: string;
  }) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.bookingId}))`;

          const booking = await tx.booking.findUnique({
            where: { id: input.bookingId },
            include: { assignment: true },
          });
          if (!booking || booking.deletedAt) {
            throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
          }

          const assignable: BookingStatus[] = [
            BookingStatus.CONFIRMED,
            BookingStatus.ASSIGNMENT_PENDING,
            BookingStatus.ASSIGNED,
          ];
          if (!assignable.includes(booking.status)) {
            throw new BadRequestException({
              code: "NOT_ASSIGNABLE",
              message: `Booking status ${booking.status} cannot be assigned`,
            });
          }

          const startsAt = booking.scheduledAt;
          const endsAt = new Date(startsAt.getTime() + TRIP_DURATION_MS);

          let vehicleId = input.vehicleId;
          if (!vehicleId) {
            const candidates = await this.availability.listEligibleVehicleIds({
              categoryId: booking.categoryId,
              passengerCapMin: booking.passengerCount,
              luggageCapMin: booking.luggageCount,
            });
            const owned = candidates.filter((c) => c.ownership === FleetOwnership.OWNED);
            const pool = owned.length ? owned : candidates;
            const busy = await this.availability.busyVehicleIds(
              pool.map((p) => p.id),
              startsAt,
              endsAt,
            );
            const free = pool.find((p) => !busy.has(p.id));
            if (!free) {
              throw new ConflictException({
                code: "NO_VEHICLE",
                message: "No eligible vehicle free for this window (DB inventory only)",
              });
            }
            vehicleId = free.id;
          }

          const vehicleRows = await tx.$queryRaw<{ id: string; active: boolean }[]>`
            SELECT id, active FROM "Vehicle" WHERE id = ${vehicleId}::uuid FOR UPDATE
          `;
          const vehicle = vehicleRows[0];
          if (!vehicle?.active) {
            throw new BadRequestException({
              code: "VEHICLE_INACTIVE",
              message: "Vehicle not available",
            });
          }

          const overlap = await tx.bookingAssignment.findFirst({
            where: {
              vehicleId,
              bookingId: { not: booking.id },
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
          });
          if (overlap) {
            throw new ConflictException({
              code: "VEHICLE_OVERLAP",
              message: "Vehicle already assigned for overlapping time",
              details: { conflictingBookingId: overlap.bookingId },
            });
          }

          if (input.driverId) {
            const driverOverlap = await tx.bookingAssignment.findFirst({
              where: {
                driverId: input.driverId,
                bookingId: { not: booking.id },
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
              },
            });
            if (driverOverlap) {
              throw new ConflictException({
                code: "DRIVER_OVERLAP",
                message: "Driver already assigned for overlapping time",
              });
            }
          }

          let fromStatus = booking.status;
          if (fromStatus === BookingStatus.CONFIRMED) {
            assertTransition(BookingStatus.CONFIRMED, BookingStatus.ASSIGNMENT_PENDING);
            await tx.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.ASSIGNMENT_PENDING },
            });
            await tx.bookingStatusEvent.create({
              data: {
                bookingId: booking.id,
                fromStatus,
                toStatus: BookingStatus.ASSIGNMENT_PENDING,
                actorId: input.actorId,
                note: "Dispatch started",
              },
            });
            fromStatus = BookingStatus.ASSIGNMENT_PENDING;
          }

          if (fromStatus === BookingStatus.ASSIGNMENT_PENDING) {
            assertTransition(BookingStatus.ASSIGNMENT_PENDING, BookingStatus.ASSIGNED);
          }

          const assignment = await tx.bookingAssignment.upsert({
            where: { bookingId: booking.id },
            create: {
              bookingId: booking.id,
              vehicleId,
              driverId: input.driverId ?? null,
              startsAt,
              endsAt,
              reason: input.reason ?? "dispatch.assign",
            },
            update: {
              vehicleId,
              driverId: input.driverId ?? null,
              startsAt,
              endsAt,
              reason: input.reason ?? "dispatch.reassign",
            },
          });

          if (fromStatus !== BookingStatus.ASSIGNED) {
            await tx.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.ASSIGNED },
            });
            await tx.bookingStatusEvent.create({
              data: {
                bookingId: booking.id,
                fromStatus,
                toStatus: BookingStatus.ASSIGNED,
                actorId: input.actorId,
                note: input.reason ?? "Assigned vehicle/driver",
              },
            });
          }

          await tx.availabilityHold.updateMany({
            where: { bookingId: booking.id, releasedAt: null },
            data: { releasedAt: new Date(), vehicleId },
          });

          await tx.auditEvent.create({
            data: {
              actorId: input.actorId,
              action: "dispatch.assign",
              resource: "booking",
              resourceId: booking.id,
              metadata: { vehicleId, driverId: input.driverId ?? null },
            },
          });

          return {
            bookingId: booking.id,
            status: BookingStatus.ASSIGNED,
            assignment: {
              id: assignment.id,
              vehicleId: assignment.vehicleId,
              driverId: assignment.driverId,
              startsAt: assignment.startsAt.toISOString(),
              endsAt: assignment.endsAt.toISOString(),
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (
        err instanceof ConflictException ||
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("could not serialize") || message.includes("40001")) {
        throw new ConflictException({
          code: "CONCURRENT_DISPATCH",
          message: "Concurrent assignment conflict — retry",
        });
      }
      if (message.includes("booking_assignment_vehicle_no_overlap")) {
        throw new ConflictException({
          code: "VEHICLE_OVERLAP",
          message: "Vehicle overlap rejected by database exclusion constraint",
        });
      }
      throw err;
    }
  }
}
