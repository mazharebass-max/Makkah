import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";
import { PrismaService } from "../src/prisma/prisma.service";

function futureIso(hoursFromNow = 72) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("M3 dispatch + holds", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    loadEnv();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    const prisma = app.get(PrismaService);
    await prisma.availabilityHold.updateMany({
      where: { releasedAt: null },
      data: { releasedAt: new Date() },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("holds reduce availability and concurrent assign conflicts", async () => {
    const scheduledAt = futureIso(120);
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const dispatcher = await login(app, "dispatcher@haramain.local", "DispatchDev!234");

    const quoteA = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "JED-MAKKAH",
      categoryCode: "VAN",
      scheduledAt,
      passengers: 4,
      luggage: 4,
    });
    expect(quoteA.status).toBe(201);

    // Only one VAN in seed — second quote for same window should fail or show unavailable
    const search = await request(app.getHttpServer()).get("/api/v1/search").query({
      routeCode: "JED-MAKKAH",
      scheduledAt,
      passengers: 4,
      luggage: 4,
    });
    expect(search.status).toBe(200);
    const van = search.body.data.find((d: { category: { code: string } }) => d.category.code === "VAN");
    expect(van.availableCount).toBe(0);

    const booked = await request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${customer}`)
      .send({
        quoteId: quoteA.body.id,
        contactName: "Dispatch Test",
        contactPhone: "+966522222222",
        acceptTerms: true,
        idempotencyKey: `m3-${quoteA.body.id}`,
      });
    expect(booked.status).toBe(201);

    const confirmed = await request(app.getHttpServer())
      .post("/api/v1/payments/sandbox/confirm")
      .set("Authorization", `Bearer ${customer}`)
      .send({ bookingId: booked.body.booking.id });
    expect(confirmed.status).toBe(201);
    expect(confirmed.body.mode).toBe("sandbox");
    expect(confirmed.body.booking.status).toBe("ASSIGNMENT_PENDING");

    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/admin/bookings/${booked.body.booking.id}/assign`)
      .set("Authorization", `Bearer ${dispatcher}`)
      .send({ reason: "m3 test assign" });
    expect(assigned.status).toBe(201);
    expect(assigned.body.status).toBe("ASSIGNED");
    expect(assigned.body.assignment.vehicleId).toBeTruthy();

    // Second booking same window on same category should not double-assign that vehicle
    const quoteB = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "JED-MAKKAH",
      categoryCode: "VAN",
      scheduledAt,
      passengers: 4,
      luggage: 4,
    });
    expect(quoteB.status).toBe(400);
  });

  it("lists owned fleet for fleet manager", async () => {
    const token = await login(app, "fleet@haramain.local", "FleetMgrDev!2345");
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/fleet/vehicles")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.inventoryNote).toMatch(/database/i);
  });
});
