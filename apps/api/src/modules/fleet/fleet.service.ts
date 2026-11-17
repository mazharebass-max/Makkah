import { Inject, Injectable } from "@nestjs/common";
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
      orderBy: { displayName: "asc" },
    });
    return {
      data: drivers.map((d) => ({
        id: d.id,
        displayName: d.displayName,
        active: d.active,
        phoneE164: d.phoneE164,
      })),
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
