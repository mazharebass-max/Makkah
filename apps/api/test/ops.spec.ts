import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("M8 staging hardening / ops gate", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.GO_LIVE_LOCKED = "true";
    process.env.ALLOW_LIVE_PAYMENTS = "false";
    process.env.ALLOW_LIVE_PROVIDERS = "false";
    loadEnv();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
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

  it("exposes liveness and readiness without go-live claims", async () => {
    const live = await request(app.getHttpServer()).get("/api/v1/health");
    expect(live.status).toBe(200);
    expect(live.body.liveOps).toBe(false);
    expect(live.headers["x-haramain-live-ops"]).toBe("false");
    expect(live.headers["x-content-type-options"]).toBe("nosniff");

    const ready = await request(app.getHttpServer()).get("/api/v1/health/ready");
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe("ready");
    expect(ready.body.productionGoLive).toBe(false);
  });

  it("staging readiness never claims regulatory clearance", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/ops/readiness");
    expect(res.status).toBe(200);
    expect(res.body.productionGoLive).toBe(false);
    expect(res.body.regulatoryClearance).toBe(false);
    expect(res.body.liveOps).toBe(false);
    expect(res.body.stagingReady).toBe(true);
    expect(res.body.checks.sandboxProviders).toBe(true);
  });

  it("compliance gate is staff-only and fully unsigned", async () => {
    const anon = await request(app.getHttpServer()).get("/api/v1/admin/ops/compliance-gate");
    expect(anon.status).toBe(401);

    const admin = await login(app, "admin@haramain.local", "AdminDev!23456");
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/ops/compliance-gate")
      .set("Authorization", `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.regulatoryClearance).toBe(false);
    expect(res.body.productionGoLive).toBe(false);
    expect(res.body.allSignedOff).toBe(false);
    expect(res.body.signedOffCount).toBe(0);
    expect(res.body.items.every((i: { signedOff: boolean }) => i.signedOff === false)).toBe(true);

    const security = await request(app.getHttpServer())
      .get("/api/v1/admin/ops/security-checklist")
      .set("Authorization", `Bearer ${admin}`);
    expect(security.status).toBe(200);
    expect(security.body.productionHardened).toBe(false);
    expect(security.body.penTestComplete).toBe(false);
  });
});
