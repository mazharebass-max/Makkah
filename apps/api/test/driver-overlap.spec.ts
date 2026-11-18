import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";
import { PrismaService } from "../src/prisma/prisma.service";

const DRIVER_A = "00000000-0000-4000-8000-000000000030";
const VEHICLE_A = "00000000-0000-4000-8000-000000000010";
const VEHICLE_B = "00000000-0000-4000-8000-000000000011";

function futureIso(hoursFromNow = 96) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

async function pendingBooking(
  app: INestApplication,
  customer: string,
  scheduledAt: string,
  key: string,
) {
  const quote = await request(app.getHttpServer()).post("/api/v1/quotes").send({
    routeCode: "JED-MAKKAH",
    categoryCode: "SEDAN",
    scheduledAt,
    passengers: 2,
    luggage: 1,
  });
  expect(quote.status).toBe(201);
  const booked = await request(app.getHttpServer())
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${customer}`)
    .send({
      quoteId: quote.body.id,
      contactName: "Driver Overlap",
      contactPhone: "+966533333333",
      acceptTerms: true,
      idempotencyKey: key,
    });
  expect(booked.status).toBe(201);
  const confirmed = await request(app.getHttpServer())
    .post("/api/v1/payments/sandbox/confirm")
    .set("Authorization", `Bearer ${customer}`)
    .send({ bookingId: booked.body.booking.id });
  expect(confirmed.status).toBe(201);
  return booked.body.booking.id as string;
}

describe("F3 driver exclusion + DriverShift", () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    prisma = app.get(PrismaService);
    await prisma.availabilityHold.updateMany({
      where: { releasedAt: null },
      data: { releasedAt: new Date() },
    });
    await prisma.bookingAssignment.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects overlapping driver assignments (app check + DB exclusion)", async () => {
    const scheduledAt = futureIso(300);
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const dispatcher = await login(app, "dispatcher@haramain.local", "DispatchDev!234");

    const bookingA = await pendingBooking(app, customer, scheduledAt, `drv-a-${Date.now()}`);
    const bookingB = await pendingBooking(
      app,
      customer,
      scheduledAt,
      `drv-b-${Date.now()}`,
    );

    const first = await request(app.getHttpServer())
      .post(`/api/v1/admin/bookings/${bookingA}/assign`)
      .set("Authorization", `Bearer ${dispatcher}`)
      .send({ vehicleId: VEHICLE_A, driverId: DRIVER_A, reason: "f3 first" });
    expect(first.status).toBe(201);
    expect(first.body.assignment.driverId).toBe(DRIVER_A);

    const second = await request(app.getHttpServer())
      .post(`/api/v1/admin/bookings/${bookingB}/assign`)
      .set("Authorization", `Bearer ${dispatcher}`)
      .send({ vehicleId: VEHICLE_B, driverId: DRIVER_A, reason: "f3 overlap" });
    expect(second.status).toBe(409);
    expect(second.body.message?.code ?? second.body.code).toBeDefined();
    const code = second.body.message?.code ?? second.body.code ?? "";
    expect(String(code || second.body.message)).toMatch(/DRIVER_OVERLAP|overlap/i);
  });

  it("rejects assignment when driver has shifts but none cover the trip", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const dispatcher = await login(app, "dispatcher@haramain.local", "DispatchDev!234");
    const fleet = await login(app, "fleet@haramain.local", "FleetMgrDev!2345");

    // Narrow shift far in the past so future trip is off-shift
    await prisma.driverShift.deleteMany({
      where: { driverId: DRIVER_A, note: "seed-wide-draft" },
    });
    await prisma.driverShift.create({
      data: {
        driverId: DRIVER_A,
        startsAt: new Date("2020-01-01T00:00:00.000Z"),
        endsAt: new Date("2020-01-02T00:00:00.000Z"),
        note: "narrow-past-test",
        draftLabel: "DRAFT — OWNER APPROVAL REQUIRED",
      },
    });

    const bookingId = await pendingBooking(
      app,
      customer,
      futureIso(320),
      `drv-off-${Date.now()}`,
    );
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/bookings/${bookingId}/assign`)
      .set("Authorization", `Bearer ${dispatcher}`)
      .send({ vehicleId: VEHICLE_B, driverId: DRIVER_A, reason: "off shift" });
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toMatch(/DRIVER_OFF_SHIFT|shift/i);

    // Restore wide draft shift for other suites
    await prisma.driverShift.deleteMany({ where: { driverId: DRIVER_A } });
    await prisma.driverShift.create({
      data: {
        driverId: DRIVER_A,
        startsAt: new Date(Date.now() - 24 * 3600_000),
        endsAt: new Date(Date.now() + 60 * 24 * 3600_000),
        note: "seed-wide-draft",
        draftLabel: "DRAFT — OWNER APPROVAL REQUIRED",
      },
    });

    const create = await request(app.getHttpServer())
      .post("/api/v1/admin/fleet/driver-shifts")
      .set("Authorization", `Bearer ${fleet}`)
      .send({
        driverId: DRIVER_A,
        startsAt: new Date(Date.now() + 90 * 24 * 3600_000).toISOString(),
        endsAt: new Date(Date.now() + 91 * 24 * 3600_000).toISOString(),
        note: "api-created-draft",
      });
    expect(create.status).toBe(201);
    expect(create.body.liveOps).toBe(false);
    expect(create.body.draftLabel).toMatch(/DRAFT/);
  });

  it("trip list exposes tripId alias and assignment window", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const trips = await request(app.getHttpServer())
      .get("/api/v1/bookings")
      .set("Authorization", `Bearer ${customer}`);
    expect(trips.status).toBe(200);
    expect(trips.body.data.length).toBeGreaterThan(0);
    expect(trips.body.data[0].tripId).toBe(trips.body.data[0].id);
    expect(trips.body.inventedAvailability).toBe(false);
  });
});
