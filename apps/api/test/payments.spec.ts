import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { createHmac } from "node:crypto";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";
import { PrismaService } from "../src/prisma/prisma.service";

function futureIso(hoursFromNow = 200) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

function sign(body: object) {
  const raw = JSON.stringify(body);
  const secret = loadEnv().PAYMENT_WEBHOOK_SECRET;
  const sig = createHmac("sha256", secret).update(raw).digest("hex");
  return { raw, header: `sha256=${sig}` };
}

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("M5 sandbox payments + ledger", () => {
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
    await prisma.bookingAssignment.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPendingBooking(token: string) {
    const quote = await request(app.getHttpServer()).post("/api/v1/quotes").send({
      routeCode: "JED-MAKKAH",
      categoryCode: "SEDAN",
      scheduledAt: futureIso(180 + Math.floor(Math.random() * 40)),
      passengers: 2,
      luggage: 1,
    });
    expect(quote.status).toBe(201);
    const booked = await request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        quoteId: quote.body.id,
        contactName: "Pay Test",
        contactPhone: "+966544444444",
        acceptTerms: true,
        idempotencyKey: `pay-${quote.body.id}`,
      });
    expect(booked.status).toBe(201);
    return booked.body.booking as { id: string; totalHalalas: number; status: string };
  }

  it("captures once via signed webhook and is idempotent on retry", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const booking = await createPendingBooking(customer);

    const checkout = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${customer}`)
      .send({ bookingId: booking.id });
    expect(checkout.status).toBe(201);
    expect(checkout.body.mode).toBe("sandbox");
    expect(checkout.body.liveCapture).toBe(false);
    const ref = checkout.body.paymentIntent.sandboxRef as string;

    const event = {
      gatewayEventId: `evt_${booking.id}_1`,
      type: "payment.succeeded",
      sandboxRef: ref,
      amountHalalas: booking.totalHalalas,
    };
    const { header } = sign(event);
    const first = await request(app.getHttpServer())
      .post("/api/v1/webhooks/payments/sandbox")
      .set("X-Haramain-Signature", header)
      .send(event);
    expect(first.status).toBe(201);
    expect(first.body.liveCapture).toBe(false);
    expect(first.body.invoiceNumber).toBeTruthy();

    const retry = await request(app.getHttpServer())
      .post("/api/v1/webhooks/payments/sandbox")
      .set("X-Haramain-Signature", header)
      .send(event);
    expect(retry.status).toBe(201);
    expect(retry.body.duplicate).toBe(true);

    const finance = await login(app, "finance@haramain.local", "FinanceDev!2345");
    const recon = await request(app.getHttpServer())
      .get("/api/v1/admin/finance/reconciliation")
      .set("Authorization", `Bearer ${finance}`);
    expect(recon.status).toBe(200);
    expect(recon.body.mode).toBe("sandbox");
    expect(recon.body.liveGateway).toBe(false);
    expect(recon.body.totals.capturedHalalas).toBeGreaterThanOrEqual(booking.totalHalalas);
    expect(recon.body.totals.issuedInvoices).toBeGreaterThanOrEqual(1);

    const invoices = await request(app.getHttpServer())
      .get("/api/v1/admin/finance/invoices")
      .set("Authorization", `Bearer ${finance}`);
    expect(invoices.status).toBe(200);
    expect(invoices.body.data.length).toBeGreaterThan(0);
  });

  it("completes sandbox checkout via authenticated simulate without inventing live capture", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const booking = await createPendingBooking(customer);

    const checkout = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${customer}`)
      .send({ bookingId: booking.id, idempotencyKey: `ui-ck-${booking.id}` });
    expect(checkout.status).toBe(201);
    expect(checkout.body.liveCapture).toBe(false);

    const complete = await request(app.getHttpServer())
      .post("/api/v1/payments/sandbox/complete")
      .set("Authorization", `Bearer ${customer}`)
      .send({ bookingId: booking.id });
    expect(complete.status).toBe(201);
    expect(complete.body.mode).toBe("sandbox");
    expect(complete.body.liveCapture).toBe(false);
    expect(complete.body.message).toMatch(/not a live/i);

    const retry = await request(app.getHttpServer())
      .post("/api/v1/payments/sandbox/complete")
      .set("Authorization", `Bearer ${customer}`)
      .send({ bookingId: booking.id });
    expect(retry.status).toBe(201);
    expect(retry.body.duplicate).toBe(true);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}`)
      .set("Authorization", `Bearer ${customer}`);
    expect(detail.status).toBe(200);
    expect(["CONFIRMED", "ASSIGNMENT_PENDING"]).toContain(detail.body.status);
  });

  it("rejects invalid webhook signature", async () => {
    const event = {
      gatewayEventId: "evt_bad_sig",
      type: "payment.succeeded",
      sandboxRef: "pay_sandbox_missing",
      amountHalalas: 100,
    };
    const res = await request(app.getHttpServer())
      .post("/api/v1/webhooks/payments/sandbox")
      .set("X-Haramain-Signature", "sha256=deadbeef")
      .send(event);
    expect(res.status).toBe(401);
  });

  it("refunds update ledger without inventing live PSP success", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const finance = await login(app, "finance@haramain.local", "FinanceDev!2345");
    const booking = await createPendingBooking(customer);
    const checkout = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${customer}`)
      .send({ bookingId: booking.id, idempotencyKey: `ck-${booking.id}` });
    const ref = checkout.body.paymentIntent.sandboxRef as string;
    const captureEvent = {
      gatewayEventId: `evt_${booking.id}_cap`,
      type: "payment.succeeded",
      sandboxRef: ref,
      amountHalalas: booking.totalHalalas,
    };
    const capSig = sign(captureEvent);
    await request(app.getHttpServer())
      .post("/api/v1/webhooks/payments/sandbox")
      .set("X-Haramain-Signature", capSig.header)
      .send(captureEvent);

    const refundReq = await request(app.getHttpServer())
      .post("/api/v1/payments/refunds")
      .set("Authorization", `Bearer ${finance}`)
      .send({ bookingId: booking.id, reason: "Test sandbox refund" });
    expect(refundReq.status).toBe(201);
    expect(refundReq.body.mode).toBe("sandbox");
    expect(refundReq.body.refund.status).toBe("PENDING");

    const refundEvent = {
      gatewayEventId: `evt_${booking.id}_ref`,
      type: "refund.succeeded",
      sandboxRef: ref,
      amountHalalas: booking.totalHalalas,
    };
    const refSig = sign(refundEvent);
    const refunded = await request(app.getHttpServer())
      .post("/api/v1/webhooks/payments/sandbox")
      .set("X-Haramain-Signature", refSig.header)
      .send(refundEvent);
    expect(refunded.status).toBe(201);
    expect(refunded.body.message).toMatch(/not a live/i);

    const recon = await request(app.getHttpServer())
      .get("/api/v1/admin/finance/reconciliation")
      .set("Authorization", `Bearer ${finance}`);
    expect(recon.body.totals.refundedHalalas).toBeGreaterThan(0);
  });
});
