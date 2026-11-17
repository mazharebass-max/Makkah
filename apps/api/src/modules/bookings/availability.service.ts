import { Inject, Injectable } from "@nestjs/common";
import { FleetOwnership, ProviderStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AvailabilityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listEligibleVehicleIds(input: {
    categoryId: string;
    passengerCapMin: number;
    luggageCapMin: number;
  }) {
    const candidates = await this.prisma.vehicle.findMany({
      where: {
        active: true,
        categoryId: input.categoryId,
        passengerCap: { gte: input.passengerCapMin },
        luggageCap: { gte: input.luggageCapMin },
        OR: [
          { ownership: FleetOwnership.OWNED },
          {
            ownership: FleetOwnership.THIRD_PARTY,
            provider: { status: ProviderStatus.APPROVED },
          },
        ],
      },
      select: { id: true, ownership: true },
      orderBy: { createdAt: "asc" },
    });
    return candidates;
  }

  async busyVehicleIds(vehicleIds: string[], startsAt: Date, endsAt: Date) {
    if (vehicleIds.length === 0) return new Set<string>();
    const [assignments, holds] = await Promise.all([
      this.prisma.bookingAssignment.findMany({
        where: {
          vehicleId: { in: vehicleIds },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { vehicleId: true },
      }),
      this.prisma.availabilityHold.findMany({
        where: {
          vehicleId: { in: vehicleIds },
          releasedAt: null,
          expiresAt: { gt: new Date() },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { vehicleId: true },
      }),
    ]);
    const busy = new Set<string>();
    for (const a of assignments) if (a.vehicleId) busy.add(a.vehicleId);
    for (const h of holds) if (h.vehicleId) busy.add(h.vehicleId);
    return busy;
  }

  /** Category-level soft holds (no specific vehicle) reduce free capacity. */
  async activeCategoryHoldCount(
    categoryId: string,
    startsAt: Date,
    endsAt: Date,
    excludeQuoteId?: string,
  ) {
    return this.prisma.availabilityHold.count({
      where: {
        categoryId,
        vehicleId: null,
        releasedAt: null,
        expiresAt: { gt: new Date() },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(excludeQuoteId ? { NOT: { quoteId: excludeQuoteId } } : {}),
      },
    });
  }

  async countAvailable(input: {
    categoryId: string;
    passengerCapMin: number;
    luggageCapMin: number;
    startsAt: Date;
    endsAt: Date;
    excludeQuoteId?: string;
  }) {
    const candidates = await this.listEligibleVehicleIds(input);
    const ids = candidates.map((c) => c.id);
    const busy = await this.busyVehicleIds(ids, input.startsAt, input.endsAt);
    const freeVehicles = ids.filter((id) => !busy.has(id)).length;
    const softHolds = await this.activeCategoryHoldCount(
      input.categoryId,
      input.startsAt,
      input.endsAt,
      input.excludeQuoteId,
    );
    return Math.max(0, freeVehicles - softHolds);
  }

  async createHold(input: {
    categoryId: string;
    vehicleId?: string | null;
    quoteId?: string | null;
    bookingId?: string | null;
    startsAt: Date;
    endsAt: Date;
    expiresAt: Date;
  }) {
    return this.prisma.availabilityHold.create({
      data: {
        categoryId: input.categoryId,
        vehicleId: input.vehicleId ?? null,
        quoteId: input.quoteId ?? null,
        bookingId: input.bookingId ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        expiresAt: input.expiresAt,
      },
    });
  }

  async releaseHoldsForQuote(quoteId: string) {
    await this.prisma.availabilityHold.updateMany({
      where: { quoteId, releasedAt: null },
      data: { releasedAt: new Date() },
    });
  }

  async releaseExpiredHolds() {
    const result = await this.prisma.availabilityHold.updateMany({
      where: { releasedAt: null, expiresAt: { lte: new Date() } },
      data: { releasedAt: new Date() },
    });
    return result.count;
  }
}
