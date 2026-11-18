import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv, resetEnvCache } from "../src/config/env";

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("F5 feature flags / settings / pickup points", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.GO_LIVE_LOCKED = "true";
    process.env.ALLOW_LIVE_PAYMENTS = "false";
    resetEnvCache();
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

  it("lists feature flags default-off with go-live false", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/feature-flags");
    expect(res.status).toBe(200);
    expect(res.body.productionGoLive).toBe(false);
    expect(res.body.regulatoryClearance).toBe(false);
    expect(res.body.liveOps).toBe(false);
    expect(res.body.goLiveLocked).toBe(true);
    const flags = res.body.data as { key: string; enabled: boolean }[];
    expect(flags.length).toBeGreaterThanOrEqual(4);
    expect(flags.every((f) => f.enabled === false)).toBe(true);
    expect(flags.some((f) => f.key === "allow_live_payments")).toBe(true);
  });

  it("lists draft airport pickup points", async () => {
    const all = await request(app.getHttpServer()).get("/api/v1/pickup-points");
    expect(all.status).toBe(200);
    expect(all.body.liveOps).toBe(false);
    expect(all.body.message).toMatch(/draft/i);
    expect(all.body.data.length).toBeGreaterThanOrEqual(3);

    const jed = await request(app.getHttpServer()).get(
      "/api/v1/pickup-points?zoneCode=JED_AIRPORT",
    );
    expect(jed.status).toBe(200);
    expect(
      (jed.body.data as { code: string; kind: string }[]).every(
        (p) => p.kind === "AIRPORT_TERMINAL",
      ),
    ).toBe(true);
    expect(jed.body.data.some((p: { code: string }) => p.code === "JED-T1")).toBe(true);
  });

  it("refuses enabling live_* flags while go-live locked", async () => {
    const admin = await login(app, "admin@haramain.local", "AdminDev!23456");
    const res = await request(app.getHttpServer())
      .patch("/api/v1/admin/settings/feature-flags/allow_live_payments")
      .set("Authorization", `Bearer ${admin}`)
      .send({ enabled: true });
    expect(res.status).toBe(400);
    expect(res.body.message ?? res.body?.message).toBeTruthy();

    const experimental = await request(app.getHttpServer())
      .patch("/api/v1/admin/settings/feature-flags/experimental_ui")
      .set("Authorization", `Bearer ${admin}`)
      .send({ enabled: true });
    expect([200, 201]).toContain(experimental.status);
    expect(experimental.body.productionGoLive).toBe(false);
    expect(experimental.body.flag.enabled).toBe(true);

    // Reset for other suites
    await request(app.getHttpServer())
      .patch("/api/v1/admin/settings/feature-flags/experimental_ui")
      .set("Authorization", `Bearer ${admin}`)
      .send({ enabled: false });
  });

  it("denies customer on admin settings", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/settings/system")
      .set("Authorization", `Bearer ${customer}`);
    expect(res.status).toBe(403);
  });
});
