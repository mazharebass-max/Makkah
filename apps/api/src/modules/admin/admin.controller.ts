import { Controller, Get, Inject, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { LocationShareRole, Prisma } from "@prisma/client";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../../prisma/prisma.service";

const STAFF_BOOKING_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.FLEET_DISPATCHER,
  RoleCode.OWNED_FLEET_MANAGER,
  RoleCode.FINANCE_OFFICER,
  RoleCode.SUPPORT_AGENT,
] as const;

type PriceSnapshot = {
  contactName?: string;
  contactPhone?: string;
};

function contactFromSnapshot(snapshot: Prisma.JsonValue | null | undefined) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { contactName: null as string | null, contactPhone: null as string | null };
  }
  const s = snapshot as PriceSnapshot;
  return {
    contactName: typeof s.contactName === "string" ? s.contactName : null,
    contactPhone: typeof s.contactPhone === "string" ? s.contactPhone : null,
  };
}

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("bookings")
  @Roles(...STAFF_BOOKING_ROLES)
  async listBookings() {
    const bookings = await this.prisma.booking.findMany({
      where: { deletedAt: null },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        route: true,
        category: true,
        assignment: {
          include: {
            driver: { select: { id: true, displayName: true, phoneE164: true } },
            vehicle: { select: { id: true, plateNumber: true, makeModel: true } },
          },
        },
      },
    });
    return {
      data: bookings.map((b) => {
        const contact = contactFromSnapshot(b.priceSnapshot);
        return {
          id: b.id,
          reference: b.reference,
          status: b.status,
          scheduledAt: b.scheduledAt.toISOString(),
          createdAt: b.createdAt.toISOString(),
          totalHalalas: b.totalHalalas,
          currency: b.currency,
          ...contact,
          route: b.route
            ? { code: b.route.code, nameEn: b.route.nameEn, nameAr: b.route.nameAr }
            : null,
          category: b.category
            ? { code: b.category.code, nameEn: b.category.nameEn, nameAr: b.category.nameAr }
            : null,
          assignment: b.assignment
            ? {
                driverId: b.assignment.driverId,
                vehicleId: b.assignment.vehicleId,
                startsAt: b.assignment.startsAt.toISOString(),
                endsAt: b.assignment.endsAt.toISOString(),
                driver: b.assignment.driver
                  ? {
                      id: b.assignment.driver.id,
                      displayName: b.assignment.driver.displayName,
                      phoneE164: b.assignment.driver.phoneE164,
                    }
                  : null,
                vehicle: b.assignment.vehicle
                  ? {
                      id: b.assignment.vehicle.id,
                      plateNumber: b.assignment.vehicle.plateNumber,
                      makeModel: b.assignment.vehicle.makeModel,
                    }
                  : null,
              }
            : null,
          liveOps: false as const,
        };
      }),
      source: "database" as const,
    };
  }

  @Get("bookings/:id")
  @Roles(...STAFF_BOOKING_ROLES)
  async getBooking(@Param("id") id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        route: true,
        category: true,
        statusEvents: { orderBy: { createdAt: "asc" } },
        assignment: {
          include: {
            driver: { select: { id: true, displayName: true, phoneE164: true, active: true } },
            vehicle: {
              select: { id: true, plateNumber: true, makeModel: true, active: true },
            },
          },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }
    const contact = contactFromSnapshot(booking.priceSnapshot);
    return {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      scheduledAt: booking.scheduledAt.toISOString(),
      createdAt: booking.createdAt.toISOString(),
      totalHalalas: booking.totalHalalas,
      currency: booking.currency,
      ...contact,
      passengerCount: booking.passengerCount,
      route: booking.route
        ? {
            code: booking.route.code,
            nameEn: booking.route.nameEn,
            nameAr: booking.route.nameAr,
          }
        : null,
      category: booking.category
        ? {
            code: booking.category.code,
            nameEn: booking.category.nameEn,
            nameAr: booking.category.nameAr,
          }
        : null,
      assignment: booking.assignment
        ? {
            driverId: booking.assignment.driverId,
            vehicleId: booking.assignment.vehicleId,
            startsAt: booking.assignment.startsAt.toISOString(),
            endsAt: booking.assignment.endsAt.toISOString(),
            driver: booking.assignment.driver,
            vehicle: booking.assignment.vehicle,
          }
        : null,
      tripTimeline: booking.statusEvents.map((e) => ({
        from: e.fromStatus,
        to: e.toStatus,
        at: e.createdAt.toISOString(),
        note: e.note,
        actorId: e.actorId,
      })),
      liveOps: false as const,
      draftLabel: "DRAFT — OWNER APPROVAL REQUIRED",
    };
  }

  /**
   * Latest consented customer + driver points for ops inspection.
   * Not a live licensed tracking product claim.
   */
  @Get("bookings/:id/live-locations")
  @Roles(...STAFF_BOOKING_ROLES)
  async liveLocations(@Param("id") id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        reference: true,
        status: true,
        assignment: {
          select: {
            driver: { select: { id: true, displayName: true, phoneE164: true } },
          },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }

    const mapLatest = async (role: LocationShareRole) => {
      const sample = await this.prisma.locationSample.findFirst({
        where: { bookingId: id, role, expiresAt: { gt: new Date() } },
        orderBy: { recordedAt: "desc" },
      });
      if (!sample) return null;
      return {
        role,
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracyM: sample.accuracyM,
        recordedAt: sample.recordedAt.toISOString(),
        expiresAt: sample.expiresAt.toISOString(),
        userId: sample.userId,
        ageSeconds: Math.max(0, Math.round((Date.now() - sample.recordedAt.getTime()) / 1000)),
      };
    };

    const [driver, customer] = await Promise.all([
      mapLatest(LocationShareRole.DRIVER),
      mapLatest(LocationShareRole.CUSTOMER),
    ]);

    return {
      bookingId: booking.id,
      reference: booking.reference,
      status: booking.status,
      polledAt: new Date().toISOString(),
      driver: {
        profile: booking.assignment?.driver
          ? {
              id: booking.assignment.driver.id,
              displayName: booking.assignment.driver.displayName,
              phoneE164: booking.assignment.driver.phoneE164,
            }
          : null,
        location: driver,
      },
      customer: {
        location: customer,
      },
      liveTracking: false as const,
      retentionNote:
        "Samples expire within ~24h after consent. Poll for freshness — not continuous licensed tracking.",
      draftLabel: "DRAFT — OWNER APPROVAL REQUIRED",
    };
  }

  /**
   * Driver + customer location / consent trail for a booking (PDPL-minimized samples).
   */
  @Get("bookings/:id/driver-log")
  @Roles(...STAFF_BOOKING_ROLES)
  async driverLog(@Param("id") id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        reference: true,
        status: true,
        assignment: {
          select: {
            driverId: true,
            vehicleId: true,
            driver: { select: { id: true, displayName: true, phoneE164: true } },
          },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    }

    const driverId = booking.assignment?.driverId ?? null;

    const [consents, samples, audits] = await Promise.all([
      this.prisma.locationConsent.findMany({
        where: { bookingId: id },
        orderBy: { grantedAt: "desc" },
        take: 40,
      }),
      this.prisma.locationSample.findMany({
        where: { bookingId: id },
        orderBy: { recordedAt: "desc" },
        take: 120,
      }),
      this.prisma.auditEvent.findMany({
        where: {
          OR: [
            { resource: "booking", resourceId: id },
            ...(driverId ? [{ resource: "driver", resourceId: driverId }] : []),
            {
              action: { startsWith: "location." },
              resourceId: id,
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return {
      bookingId: booking.id,
      reference: booking.reference,
      status: booking.status,
      driver: booking.assignment?.driver
        ? {
            id: booking.assignment.driver.id,
            displayName: booking.assignment.driver.displayName,
            phoneE164: booking.assignment.driver.phoneE164,
          }
        : null,
      vehicleId: booking.assignment?.vehicleId ?? null,
      consents: consents.map((c) => ({
        id: c.id,
        role: c.role,
        driverId: c.driverId,
        userId: c.userId,
        purpose: c.purpose,
        grantedAt: c.grantedAt.toISOString(),
        revokedAt: c.revokedAt?.toISOString() ?? null,
        active: !c.revokedAt,
      })),
      locationSamples: samples.map((s) => ({
        id: s.id,
        role: s.role,
        driverId: s.driverId,
        userId: s.userId,
        latitude: s.latitude,
        longitude: s.longitude,
        accuracyM: s.accuracyM,
        recordedAt: s.recordedAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        expired: s.expiresAt.getTime() <= Date.now(),
      })),
      auditTrail: audits.map((a) => ({
        id: a.id,
        action: a.action,
        resource: a.resource,
        resourceId: a.resourceId,
        actorId: a.actorId,
        metadata: a.metadata,
        at: a.createdAt.toISOString(),
      })),
      retentionNote:
        "Location samples expire within ~24h (PDPL minimize). Not live licensed tracking.",
      liveTracking: false as const,
      draftLabel: "DRAFT — OWNER APPROVAL REQUIRED",
    };
  }
}
