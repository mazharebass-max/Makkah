import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FleetOwnership } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FleetService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listOwnedVehicles() {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { ownership: FleetOwnership.OWNED },
      include: { category: true },
      orderBy: { plateNumber: "asc" },
    });
    return {
      inventoryNote: "Owned fleet rows from database — not live market availability claims",
      data: vehicles.map((v) => ({
        id: v.id,
        plateNumber: v.plateNumber,
        makeModel: v.makeModel,
        modelYear: v.modelYear,
        active: v.active,
        passengerCap: v.passengerCap,
        luggageCap: v.luggageCap,
        availabilityNote: v.availabilityNote,
        category: v.category
          ? {
              code: v.category.code,
              nameEn: v.category.nameEn,
              draftLabel: v.category.draftLabel,
            }
          : null,
      })),
    };
  }

  async listOwnedDrivers() {
    const drivers = await this.prisma.driver.findMany({
      where: { ownership: FleetOwnership.OWNED },
      include: {
        shifts: {
          orderBy: { startsAt: "asc" },
          take: 20,
        },
      },
      orderBy: { displayName: "asc" },
    });
    return {
      data: drivers.map((d) => ({
        id: d.id,
        displayName: d.displayName,
        active: d.active,
        phoneE164: d.phoneE164,
        shifts: d.shifts.map((s) => ({
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          note: s.note,
          draftLabel: s.draftLabel,
        })),
      })),
    };
  }

  async listDriverShifts(driverId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Driver not found" });
    }
    const shifts = await this.prisma.driverShift.findMany({
      where: { driverId },
      orderBy: { startsAt: "asc" },
      take: 100,
    });
    return {
      driverId,
      draftRoster: true as const,
      liveOps: false as const,
      data: shifts.map((s) => ({
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        note: s.note,
        draftLabel: s.draftLabel,
      })),
    };
  }

  async createDriverShift(
    input: {
      driverId: string;
      startsAt: string;
      endsAt: string;
      note?: string;
    },
    actorId: string,
  ) {
    const driver = await this.prisma.driver.findUnique({ where: { id: input.driverId } });
    if (!driver || !driver.active) {
      throw new BadRequestException({
        code: "DRIVER_INACTIVE",
        message: "Driver missing or inactive",
      });
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (!(startsAt < endsAt)) {
      throw new BadRequestException({
        code: "INVALID_SHIFT",
        message: "startsAt must be before endsAt",
      });
    }
    const shift = await this.prisma.driverShift.create({
      data: {
        driverId: input.driverId,
        startsAt,
        endsAt,
        note: input.note,
        draftLabel: "DRAFT — OWNER APPROVAL REQUIRED",
      },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId,
        action: "fleet.driver_shift.create",
        resource: "driver_shift",
        resourceId: shift.id,
        metadata: { driverId: input.driverId, draft: true, liveOps: false },
      },
    });
    return {
      id: shift.id,
      driverId: shift.driverId,
      startsAt: shift.startsAt.toISOString(),
      endsAt: shift.endsAt.toISOString(),
      draftLabel: shift.draftLabel,
      liveOps: false as const,
    };
  }

  async setVehicleActive(vehicleId: string, active: boolean, actorId: string) {
    const vehicle = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { active },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId,
        action: active ? "fleet.vehicle.activate" : "fleet.vehicle.deactivate",
        resource: "vehicle",
        resourceId: vehicleId,
      },
    });
    return {
      id: vehicle.id,
      active: vehicle.active,
      availabilityNote: vehicle.availabilityNote,
    };
  }
}
