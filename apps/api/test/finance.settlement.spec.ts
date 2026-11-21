import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { createHmac } from "node:crypto";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";
import { PrismaService } from "../src/prisma/prisma.service";
import { DRAFT_COMMISSION_RATE_BPS } from "../src/modules/payments/payments.service";

const PROVIDER_A_ID = "00000000-0000-4000-8000-000000000020";

function futureIso(hoursFromNow = 220) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

function sign(body: object) {
  const raw = JSON.stringify(body);
  const secret = loadEnv().PAYMENT_WEBHOOK_SECRET;
  const sig = createHmac("sha256", secret).update(raw).digest("hex");
  return { header: `sha256=${sig}` };
}

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("F4 sandbox commission / payable / settlement", () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    prisma = app.get(PrismaService);
    await prisma.availabilityHold.updateMany({
      where: { releasedAt: null },
      data: { releasedAt: new Date() },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPaidBooking(customerToken: string) {
    // Avoid NO_INVENTORY when earlier suites left soft SEDAN holds on the shared CI DB.
    await prisma.availabilityHold.updateMany({
      where: { releasedAt: null },
      data: { releasedAt: new Date() },
    });
    const quote = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "JED-MAKKAH",
      categoryCode: "SEDAN",
      scheduledAt: futureIso(500 + Math.floor(Math.random() * 200)),
      passengers: 2,
      luggage: 1,
    });
    expect(quote.status, JSON.stringify(quote.body)).toBe(201);
    const booked = await request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        quoteId: quote.body.id,
        contactName: "Settlement Test",
        contactPhone: "+966555555501",
        acceptTerms: true,
        idempotencyKey: `stl-${quote.body.id}`,
      });
    expect(booked.status).toBe(201);
    const booking = booked.body.booking as { id: string; totalHalalas: number };

    const checkout = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ bookingId: booking.id, idempotencyKey: `stl-ck-${booking.id}` });
    expect(checkout.status).toBe(201);
    const ref = checkout.body.paymentIntent.sandboxRef as string;
    const event = {
      gatewayEventId: `evt_stl_${booking.id}`,
      type: "payment.succeeded",
      sandboxRef: ref,
      amountHalalas: booking.totalHalalas,
    };
    const { header } = sign(event);
    const capture = await request(app.getHttpServer())
      .post("/api/v1/webhooks/payments/sandbox")
      .set("X-Haramain-Signature", header)
      .send(event);
    expect(capture.status).toBe(201);
    expect(capture.body.liveCapture).toBe(false);
    return booking;
  }

  it("accrues draft commission on sandbox capture and issues sandbox settlement only", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const finance = await login(app, "finance@haramain.local", "FinanceDev!2345");
    const booking = await createPaidBooking(customer);

    const commissions = await request(app.getHttpServer())
      .get("/api/v1/admin/finance/commissions")
      .set("Authorization", `Bearer ${finance}`);
    expect(commissions.status).toBe(200);
    expect(commissions.body.mode).toBe("sandbox");
    expect(commissions.body.livePayout).toBe(false);
    const row = (commissions.body.data as { bookingId: string; amountHalalas: number; rateBps: number }[]).find(
      (c) => c.bookingId === booking.id,
    );
    expect(row).toBeTruthy();
    expect(row!.rateBps).toBe(DRAFT_COMMISSION_RATE_BPS);
    expect(row!.amountHalalas).toBe(
      Math.floor((booking.totalHalalas * DRAFT_COMMISSION_RATE_BPS) / 10_000),
    );

    const startsAt = new Date(Date.now() + 200 * 3600_000);
    const endsAt = new Date(startsAt.getTime() + 3 * 3600_000);
    await prisma.bookingAssignment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        providerId: PROVIDER_A_ID,
        startsAt,
        endsAt,
        reason: "f4.test.third_party_assign",
      },
      update: {
        providerId: PROVIDER_A_ID,
        startsAt,
        endsAt,
        reason: "f4.test.third_party_assign",
      },
    });

    const generated = await request(app.getHttpServer())
      .post("/api/v1/admin/finance/settlements/generate")
      .set("Authorization", `Bearer ${finance}`)
      .send({ providerId: PROVIDER_A_ID });
    expect(generated.status).toBe(201);
    expect(generated.body.mode).toBe("sandbox");
    expect(generated.body.livePayout).toBe(false);
    expect(generated.body.message).toMatch(/not a live bank payout/i);
    expect(generated.body.settlement.livePayout).toBe(false);
    expect(generated.body.settlement.totalHalalas).toBeGreaterThan(0);

    const settlementId = generated.body.settlement.id as string;
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/finance/settlements/${settlementId}`)
      .set("Authorization", `Bearer ${finance}`);
    expect(detail.status).toBe(200);
    expect(detail.body.livePayout).toBe(false);
    expect(detail.body.settlement.livePayout).toBe(false);
    expect(detail.body.settlement.payables.length).toBeGreaterThanOrEqual(1);

    const marked = await request(app.getHttpServer())
      .post(`/api/v1/admin/finance/settlements/${settlementId}/mark-sandbox-paid`)
      .set("Authorization", `Bearer ${finance}`)
      .send({});
    expect(marked.status).toBe(201);
    expect(marked.body.livePayout).toBe(false);
    expect(marked.body.settlement.status).toBe("MARKED_SANDBOX_PAID");
    expect(marked.body.settlement.livePayout).toBe(false);
    expect(marked.body.message).toMatch(/not a live bank payout/i);

    const recon = await request(app.getHttpServer())
      .get("/api/v1/admin/finance/reconciliation")
      .set("Authorization", `Bearer ${finance}`);
    expect(recon.status).toBe(200);
    expect(recon.body.liveGateway).toBe(false);
    expect(recon.body.livePayout).toBe(false);
    expect(recon.body.totals.commissionCount).toBeGreaterThanOrEqual(1);
    expect(recon.body.totals.settlementCount).toBeGreaterThanOrEqual(1);
  });

  it("denies customer on settlement generate", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const res = await request(app.getHttpServer())
      .post("/api/v1/admin/finance/settlements/generate")
      .set("Authorization", `Bearer ${customer}`)
      .send({ providerId: PROVIDER_A_ID });
    expect(res.status).toBe(403);
  });
});
