import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { loadEnv } from "../src/config/env";
import { PrismaService } from "../src/prisma/prisma.service";
import { allowOtpDebugCode } from "../src/modules/auth/otp.util";
import { generateTotp, generateTotpSecret, verifyTotp } from "../src/modules/auth/totp";

async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password });
  expect(res.status).toBe(201);
  return res.body;
}

describe("F2 auth OTP + MFA scaffold", () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  it("allowOtpDebugCode is false for staging/production app envs", () => {
    expect(
      allowOtpDebugCode({
        NODE_ENV: "production",
        APP_ENV: "staging",
      } as never),
    ).toBe(false);
    expect(
      allowOtpDebugCode({
        NODE_ENV: "production",
        APP_ENV: "production",
      } as never),
    ).toBe(false);
    expect(
      allowOtpDebugCode({
        NODE_ENV: "test",
        APP_ENV: "test",
      } as never),
    ).toBe(true);
  });

  it("requests and verifies email OTP; debugCode present only in test/dev", async () => {
    const email = "customer@haramain.local";
    const reqRes = await request(app.getHttpServer())
      .post("/api/v1/auth/otp/request")
      .send({ email });
    expect(reqRes.status).toBe(201);
    expect(reqRes.body.liveDelivery).toBe(false);
    expect(reqRes.body.debugCode).toMatch(/^\d{6}$/);

    const challenge = await prisma.otpChallenge.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(challenge).toBeTruthy();

    const verify = await request(app.getHttpServer())
      .post("/api/v1/auth/otp/verify")
      .send({ email, code: reqRes.body.debugCode });
    expect(verify.status).toBe(201);
    expect(verify.body.verified).toBe(true);
    expect(verify.body.liveDelivery).toBe(false);

    const identity = await prisma.userIdentity.findFirst({
      where: { provider: "email", subject: email },
    });
    expect(identity?.verifiedAt).toBeTruthy();
  });

  it("rejects wrong OTP codes", async () => {
    const email = "customer@haramain.local";
    await request(app.getHttpServer()).post("/api/v1/auth/otp/request").send({ email });
    const bad = await request(app.getHttpServer())
      .post("/api/v1/auth/otp/verify")
      .send({ email, code: "000000" });
    expect(bad.status).toBe(401);
  });

  it("enrolls and confirms admin TOTP MFA; login then requires MFA", async () => {
    const adminLogin = await login(app, "admin@haramain.local", "AdminDev!23456");
    expect(adminLogin.mfaRequired).toBe(false);
    expect(adminLogin.accessToken).toBeTruthy();
    const token = adminLogin.accessToken as string;

    const enroll = await request(app.getHttpServer())
      .post("/api/v1/auth/mfa/totp/enroll")
      .set("Authorization", `Bearer ${token}`);
    expect(enroll.status).toBe(201);
    expect(enroll.body.mode).toBe("scaffold");
    expect(enroll.body.liveOps).toBe(false);
    expect(enroll.body.secret).toMatch(/^[A-Z2-7]+$/);
    expect(enroll.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);

    const code = generateTotp(enroll.body.secret);
    const confirm = await request(app.getHttpServer())
      .post("/api/v1/auth/mfa/totp/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ code });
    expect(confirm.status).toBe(201);
    expect(confirm.body.mfaEnabled).toBe(true);
    expect(confirm.body.liveOps).toBe(false);

    const stepped = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "admin@haramain.local", password: "AdminDev!23456" });
    expect(stepped.status).toBe(201);
    expect(stepped.body.mfaRequired).toBe(true);
    expect(stepped.body.mfaToken).toBeTruthy();
    expect(stepped.body.accessToken).toBeUndefined();
    expect(stepped.body.liveOps).toBe(false);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "admin@haramain.local" },
    });
    const totp = generateTotp(user.mfaTotpSecret!);
    const done = await request(app.getHttpServer())
      .post("/api/v1/auth/mfa/totp/verify")
      .send({ mfaToken: stepped.body.mfaToken, code: totp });
    expect(done.status).toBe(201);
    expect(done.body.mfaRequired).toBe(false);
    expect(done.body.accessToken).toBeTruthy();
    expect(done.body.liveOps).toBe(false);

    // Disable MFA so other suites keep working with password-only admin login
    await prisma.user.update({
      where: { email: "admin@haramain.local" },
      data: { mfaEnabledAt: null, mfaTotpSecret: null },
    });
  });

  it("forbids customer from MFA enroll", async () => {
    const customer = await login(app, "customer@haramain.local", "CustomerDev!234");
    const enroll = await request(app.getHttpServer())
      .post("/api/v1/auth/mfa/totp/enroll")
      .set("Authorization", `Bearer ${customer.accessToken}`);
    expect(enroll.status).toBe(403);
  });

  it("totp helpers round-trip", () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, "000000")).toBe(false);
  });

  it("ops security checklist marks admin MFA as scaffold (not go-live)", async () => {
    const admin = await login(app, "admin@haramain.local", "AdminDev!23456");
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/ops/security-checklist")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.liveOps).toBe(false);
    expect(res.body.productionHardened).toBe(false);
    const mfa = res.body.controls.find((c: { id: string }) => c.id === "admin-mfa");
    expect(mfa.status).toBe("IMPLEMENTED_SCAFFOLD");
  });
});
