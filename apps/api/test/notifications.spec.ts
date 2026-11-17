import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";
import { PrismaService } from "../src/prisma/prisma.service";

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("M7 notifications + support + analytics", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.WORKER_SECRET = "test-worker-secret";
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
  });

  afterAll(async () => {
    await app.close();
  });

  it("queues sandbox OTP via outbox and never claims live delivery", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/otp/request")
      .send({ email: "customer@haramain.local" });
    expect(res.status).toBe(201);
    expect(res.body.mode).toBe("sandbox");
    expect(res.body.liveDelivery).toBe(false);
    expect(res.body.debugCode).toMatch(/^\d{6}$/);
    expect(res.body.processed.liveDelivery).toBe(false);

    const notification = await prisma.notification.findFirst({
      where: { templateCode: "otp_email", toAddress: "customer@haramain.local" },
      orderBy: { createdAt: "desc" },
    });
    expect(notification?.status).toBe("SENT_SANDBOX");
    expect(notification?.sandboxRef).toMatch(/^email_sandbox_/);
  });

  it("dedupes notifications by dedupeKey when draining outbox", async () => {
    const support = await login(app, "support@haramain.local", "SupportDev!2345");
    const dedupeKey = `test-dedupe-${Date.now()}`;
    await prisma.outboxEvent.create({
      data: {
        type: "notification.test",
        payload: {
          toEmail: "customer@haramain.local",
          templateCode: "booking_status",
          vars: { reference: "REF-TEST", status: "TEST" },
          dedupeKey,
        },
      },
    });
    await prisma.outboxEvent.create({
      data: {
        type: "notification.test",
        payload: {
          toEmail: "customer@haramain.local",
          templateCode: "booking_status",
          vars: { reference: "REF-TEST", status: "TEST" },
          dedupeKey,
        },
      },
    });

    const first = await request(app.getHttpServer())
      .post("/api/v1/admin/notifications/process-outbox")
      .set("Authorization", `Bearer ${support}`);
    expect(first.status).toBe(201);
    expect(first.body.liveDelivery).toBe(false);
    expect(first.body.sent + first.body.skipped).toBeGreaterThanOrEqual(2);

    const count = await prisma.notification.count({ where: { dedupeKey } });
    expect(count).toBe(1);
  });

  it("creates support tickets and lists them for support agents", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const created = await request(app.getHttpServer())
      .post("/api/v1/support/tickets")
      .set("Authorization", `Bearer ${customer}`)
      .send({
        subject: "Where is my sandbox booking?",
        body: "Need help with a draft booking — sandbox only.",
      });
    expect(created.status).toBe(201);
    expect(created.body.id).toBeTruthy();

    const support = await login(app, "support@haramain.local", "SupportDev!2345");
    const list = await request(app.getHttpServer())
      .get("/api/v1/support/tickets")
      .set("Authorization", `Bearer ${support}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((t: { id: string }) => t.id === created.body.id)).toBe(true);

    const reply = await request(app.getHttpServer())
      .post(`/api/v1/support/tickets/${created.body.id}/messages`)
      .set("Authorization", `Bearer ${support}`)
      .send({ body: "We can see your sandbox ticket. No live SMS sent." });
    expect(reply.status).toBe(201);

    const status = await request(app.getHttpServer())
      .patch(`/api/v1/admin/support/tickets/${created.body.id}/status`)
      .set("Authorization", `Bearer ${support}`)
      .send({ status: "RESOLVED" });
    expect(status.status).toBe(200);
    expect(status.body.status).toBe("RESOLVED");
  });

  it("records analytics events and returns admin summary", async () => {
    const track = await request(app.getHttpServer())
      .post("/api/v1/analytics/events")
      .send({ name: "m7.test.event", props: { ok: true }, source: "test" });
    expect(track.status).toBe(201);
    expect(track.body.recorded).toBe(true);

    const admin = await login(app, "admin@haramain.local", "AdminDev!23456");
    const summary = await request(app.getHttpServer())
      .get("/api/v1/admin/analytics/summary")
      .set("Authorization", `Bearer ${admin}`);
    expect(summary.status).toBe(200);
    expect(summary.body.totals.notifications).toBeGreaterThanOrEqual(0);
    expect(summary.body.events.some((e: { name: string }) => e.name === "m7.test.event")).toBe(
      true,
    );
  });

  it("allows worker secret to drain outbox internally", async () => {
    await prisma.outboxEvent.create({
      data: {
        type: "notification.worker",
        payload: {
          toEmail: "customer@haramain.local",
          templateCode: "booking_created",
          vars: { reference: "WRK-1" },
          dedupeKey: `worker-drain-${Date.now()}`,
        },
      },
    });
    const bad = await request(app.getHttpServer())
      .post("/api/v1/internal/outbox/process")
      .set("x-worker-secret", "wrong");
    expect(bad.status).toBe(401);

    const ok = await request(app.getHttpServer())
      .post("/api/v1/internal/outbox/process")
      .set("x-worker-secret", "test-worker-secret");
    expect(ok.status).toBe(201);
    expect(ok.body.mode).toBe("sandbox");
    expect(ok.body.liveDelivery).toBe(false);
  });
});
