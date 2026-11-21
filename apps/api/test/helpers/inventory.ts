import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { expect } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";

let slotCounter = 0;

/** Far-future, non-overlapping trip windows so soft holds do not collide across cases. */
export function uniqueFutureIso(baseHours = 720) {
  slotCounter += 1;
  // Space windows by 6h so TRIP_DURATION overlaps cannot stack two holds on one unit.
  const hours = baseHours + slotCounter * 6;
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export async function releaseOpenHolds(prisma: PrismaService) {
  await prisma.availabilityHold.updateMany({
    where: { releasedAt: null },
    data: { releasedAt: new Date() },
  });
}

/**
 * Create a SEDAN quote after clearing soft holds. Retries once on UNAVAILABLE so
 * shared CI inventory (payment/settlement suites) stays reliable.
 */
export async function createSedanQuote(
  app: INestApplication,
  prisma: PrismaService,
  overrides?: { passengers?: number; luggage?: number },
) {
  const body = {
    routeCode: "JED-MAKKAH",
    categoryCode: "SEDAN",
    passengers: overrides?.passengers ?? 2,
    luggage: overrides?.luggage ?? 1,
  };

  let lastBody: unknown;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    await releaseOpenHolds(prisma);
    const res = await request(app.getHttpServer())
      .post("/api/v1/quotes")
      .send({ ...body, scheduledAt: uniqueFutureIso(800 + attempt * 50) });
    lastStatus = res.status;
    lastBody = res.body;
    if (res.status === 201) return res;
    const code =
      (res.body as { code?: string; message?: { code?: string } })?.code ??
      (res.body as { message?: { code?: string } })?.message?.code;
    if (code !== "UNAVAILABLE" && !String((res.body as { message?: string })?.message ?? "").includes("available")) {
      break;
    }
  }
  expect(lastStatus, JSON.stringify(lastBody)).toBe(201);
  throw new Error("createSedanQuote unreachable");
}
