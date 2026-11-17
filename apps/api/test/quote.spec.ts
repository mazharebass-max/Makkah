import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";

function futureIso(hoursFromNow = 48) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

describe("Search / quote / checkout draft", () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  it("searches launch corridor with DB availability", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/search").query({
      routeCode: "JED-MAKKAH",
      scheduledAt: futureIso(),
      passengers: 2,
      luggage: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.route.code).toBe("JED-MAKKAH");
    expect(res.body.cancellationPolicy.draftLabel).toContain("DRAFT");
    const sedan = res.body.data.find((d: { category: { code: string } }) => d.category.code === "SEDAN");
    expect(sedan.available).toBe(true);
    expect(sedan.availableCount).toBeGreaterThan(0);
    const coach = res.body.data.find((d: { category: { code: string } }) => d.category.code === "COACH");
    expect(coach.available).toBe(false);
    expect(coach.unavailableReason).toBe("NO_INVENTORY");
  });

  it("rejects quote when no inventory", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "JED-MAKKAH",
      categoryCode: "COACH",
      scheduledAt: futureIso(),
      passengers: 10,
      luggage: 5,
    });
    expect(res.status).toBe(400);
    expect(res.body.message?.code ?? res.body.code ?? res.body.message).toBeTruthy();
  });

  it("creates quote with itemized draft pricing", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "MAKKAH-MADINAH",
      categoryCode: "VAN",
      scheduledAt: futureIso(72),
      passengers: 4,
      luggage: 4,
    });
    expect(res.status).toBe(201);
    expect(res.body.lines.length).toBeGreaterThan(1);
    expect(res.body.lines.every((l: { draftLabel: string }) => l.draftLabel.includes("DRAFT"))).toBe(
      true,
    );
    expect(res.body.cancellationPolicy.draftLabel).toContain("DRAFT");
  });

  it("requires auth for booking checkout draft", async () => {
    const quote = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "MED-MADINAH",
      categoryCode: "SEDAN",
      scheduledAt: futureIso(96),
      passengers: 2,
      luggage: 1,
    });
    expect(quote.status).toBe(201);
    const anon = await request(app.getHttpServer()).post("/api/v1/bookings").send({
      quoteId: quote.body.id,
      contactName: "Guest",
      contactPhone: "+966500000000",
      acceptTerms: true,
    });
    expect(anon.status).toBe(401);

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "customer@haramain.local", password: "CustomerDev!234" });
    const token = login.body.accessToken as string;
    const booked = await request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        quoteId: quote.body.id,
        contactName: "Pilgrim Test",
        contactPhone: "+966511111111",
        acceptTerms: true,
        idempotencyKey: `test-${quote.body.id}`,
      });
    expect(booked.status).toBe(201);
    expect(booked.body.booking.status).toBe("PENDING_PAYMENT");
    expect(booked.body.paymentHint.mode).toBe("sandbox");

    const pay = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountHalalas: booked.body.booking.totalHalalas });
    expect(pay.status).toBe(201);
    expect(pay.body.mode).toBe("sandbox");
  });
});
