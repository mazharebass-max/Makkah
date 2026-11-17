import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { createHmac } from "node:crypto";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";
import { PrismaService } from "../src/prisma/prisma.service";

function futureIso(h = 220) {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function sign(body: object) {
  const raw = JSON.stringify(body);
  const sig = createHmac("sha256", loadEnv().PAYMENT_WEBHOOK_SECRET).update(raw).digest("hex");
  return { header: `sha256=${sig}` };
}

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("M6 mobile booking/trip smoke", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    loadEnv();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
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

  it("customer history + driver assignment + consented location", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const dispatcher = await login(app, "dispatcher@haramain.local", "DispatchDev!234");
    const driver = await login(app, "driver@haramain.local", "DriverDev!23456");

    const quote = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "MAKKAH-MADINAH",
      categoryCode: "SEDAN",
      scheduledAt: futureIso(),
      passengers: 2,
      luggage: 1,
    });
    expect(quote.status).toBe(201);

    const booked = await request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${customer}`)
      .send({
        quoteId: quote.body.id,
        contactName: "Mobile Smoke",
        contactPhone: "+966555555555",
        acceptTerms: true,
        idempotencyKey: `m6-${quote.body.id}`,
      });
    expect(booked.status).toBe(201);
    const bookingId = booked.body.booking.id as string;

    const checkout = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${customer}`)
      .send({ bookingId });
    const event = {
      gatewayEventId: `m6_evt_${bookingId}`,
      type: "payment.succeeded",
      sandboxRef: checkout.body.paymentIntent.sandboxRef,
      amountHalalas: booked.body.booking.totalHalalas,
    };
    await request(app.getHttpServer())
      .post("/api/v1/webhooks/payments/sandbox")
      .set("X-Haramain-Signature", sign(event).header)
      .send(event);

    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/admin/bookings/${bookingId}/assign`)
      .set("Authorization", `Bearer ${dispatcher}`)
      .send({
        driverId: "00000000-0000-4000-8000-000000000030",
        reason: "M6 mobile smoke",
      });
    expect(assigned.status).toBe(201);
    expect(assigned.body.status).toBe("ASSIGNED");

    const history = await request(app.getHttpServer())
      .get("/api/v1/bookings")
      .set("Authorization", `Bearer ${customer}`);
    expect(history.status).toBe(200);
    expect(history.body.inventedAvailability).toBe(false);
    expect(history.body.data.some((t: { id: string }) => t.id === bookingId)).toBe(true);

    const driverTrips = await request(app.getHttpServer())
      .get("/api/v1/driver/trips")
      .set("Authorization", `Bearer ${driver}`);
    expect(driverTrips.status).toBe(200);
    expect(driverTrips.body.data.some((t: { id: string }) => t.id === bookingId)).toBe(true);

    const noLoc = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/location`)
      .set("Authorization", `Bearer ${driver}`)
      .send({ latitude: 21.42, longitude: 39.82 });
    expect(noLoc.status).toBe(400);

    const consent = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/location/consent`)
      .set("Authorization", `Bearer ${driver}`);
    expect(consent.status).toBe(201);
    expect(consent.body.consented).toBe(true);

    const sample = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/location`)
      .set("Authorization", `Bearer ${driver}`)
      .send({ latitude: 21.4225, longitude: 39.8262, accuracyM: 10 });
    expect(sample.status).toBe(201);

    const enRoute = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/transition`)
      .set("Authorization", `Bearer ${driver}`)
      .send({ toStatus: "DRIVER_EN_ROUTE", note: "Leaving depot" });
    expect(enRoute.status).toBe(201);

    const customerView = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}/location`)
      .set("Authorization", `Bearer ${customer}`);
    expect(customerView.status).toBe(200);
    expect(customerView.body.sample.latitude).toBeCloseTo(21.4225);
  });
});
