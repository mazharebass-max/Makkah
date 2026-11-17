import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";

describe("RBAC & auth security", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    loadEnv();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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

  it("rejects unauthenticated admin bookings", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/admin/bookings");
    expect(res.status).toBe(401);
  });

  it("rejects customer role on admin bookings", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "customer@haramain.local", password: "CustomerDev!234" });
    expect(login.status).toBe(201);
    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/bookings")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows super admin on admin bookings", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "admin@haramain.local", password: "AdminDev!23456" });
    expect(login.status).toBe(201);
    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/bookings")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });

  it("allows compliance officer on compliance review queue", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "compliance@haramain.local", password: "ComplianceDev!2" });
    expect(login.status).toBe(201);
    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/compliance/providers")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("denies customer on finance reconciliation", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "customer@haramain.local", password: "CustomerDev!234" });
    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/finance/reconciliation")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("health is public", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("sandbox payment never claims live capture", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "customer@haramain.local", password: "CustomerDev!234" });
    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountHalalas: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.mode).toBe("sandbox");
  });
});
