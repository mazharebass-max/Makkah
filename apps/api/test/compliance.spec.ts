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

describe("M4 provider compliance + isolation", () => {
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
    // Reset seed providers to APPLIED so approval-path tests are deterministic
    const { PrismaService } = await import("../src/prisma/prisma.service");
    const { ProviderStatus } = await import("@prisma/client");
    const prisma = app.get(PrismaService);
    await prisma.provider.updateMany({
      where: {
        id: {
          in: [
            "00000000-0000-4000-8000-000000000020",
            "00000000-0000-4000-8000-000000000021",
          ],
        },
      },
      data: {
        status: ProviderStatus.APPLIED,
        suspensionReason: null,
        suspendedAt: null,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("enforces provider document isolation", async () => {
    const tokenA = await login(app, "provider-a@haramain.local", "ProviderADev!234");
    const tokenB = await login(app, "provider-b@haramain.local", "ProviderBDev!234");

    const meA = await request(app.getHttpServer())
      .get("/api/v1/providers/me")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(meA.status).toBe(200);
    expect(meA.body.provider.status).toBe("APPLIED");
    const docA = meA.body.documents.find(
      (d: { storageKey: string }) => d.storageKey.includes("provider-a"),
    );
    expect(docA).toBeTruthy();

    const meB = await request(app.getHttpServer())
      .get("/api/v1/providers/me")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(meB.status).toBe(200);
    const foreign = meB.body.documents.find((d: { id: string }) => d.id === docA.id);
    expect(foreign).toBeUndefined();

    const steal = await request(app.getHttpServer())
      .get(`/api/v1/providers/documents/${docA.id}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(steal.status).toBe(403);
  });

  it("requires human compliance review to approve; blocks expired docs", async () => {
    const compliance = await login(app, "compliance@haramain.local", "ComplianceDev!2");
    const provider = await login(app, "provider-a@haramain.local", "ProviderADev!234");

    // Expire past-due docs first (queue listing also expires)
    const expire = await request(app.getHttpServer())
      .post("/api/v1/admin/compliance/expire-documents")
      .set("Authorization", `Bearer ${compliance}`);
    expect(expire.status).toBe(201);

    const queue = await request(app.getHttpServer())
      .get("/api/v1/admin/compliance/providers")
      .set("Authorization", `Bearer ${compliance}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data.length).toBeGreaterThan(0);
    const providerARow = queue.body.data.find(
      (p: { id: string }) => p.id === "00000000-0000-4000-8000-000000000020",
    );
    expect(providerARow.expiredDocs).toBeGreaterThanOrEqual(1);

    const providerId = "00000000-0000-4000-8000-000000000020";

    // Move to IN_REVIEW then attempt APPROVE with expired docs → fail
    const review1 = await request(app.getHttpServer())
      .post(`/api/v1/admin/compliance/providers/${providerId}/review`)
      .set("Authorization", `Bearer ${compliance}`)
      .send({ toStatus: "IN_REVIEW", note: "Starting human review" });
    expect(review1.status).toBe(201);

    const approveBlocked = await request(app.getHttpServer())
      .post(`/api/v1/admin/compliance/providers/${providerId}/review`)
      .set("Authorization", `Bearer ${compliance}`)
      .send({ toStatus: "APPROVED", note: "Attempt approve with expired insurance" });
    expect(approveBlocked.status).toBe(400);
    const errCode =
      approveBlocked.body?.message?.code ??
      approveBlocked.body?.code ??
      JSON.stringify(approveBlocked.body);
    expect(String(errCode)).toMatch(/EXPIRED/);

    // Provider cannot self-approve
    const selfApprove = await request(app.getHttpServer())
      .post(`/api/v1/admin/compliance/providers/${providerId}/review`)
      .set("Authorization", `Bearer ${provider}`)
      .send({ toStatus: "APPROVED", note: "Self approve attempt" });
    expect(selfApprove.status).toBe(403);
  });

  it("suspends provider with reason and allows approval after clearing expiry", async () => {
    const compliance = await login(app, "compliance@haramain.local", "ComplianceDev!2");
    const providerBId = "00000000-0000-4000-8000-000000000021";

    const toReview = await request(app.getHttpServer())
      .post(`/api/v1/admin/compliance/providers/${providerBId}/review`)
      .set("Authorization", `Bearer ${compliance}`)
      .send({ toStatus: "IN_REVIEW", note: "Reviewing isolation provider B" });
    expect(toReview.status).toBe(201);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/admin/compliance/providers/${providerBId}/review`)
      .set("Authorization", `Bearer ${compliance}`)
      .send({
        toStatus: "APPROVED",
        note: "Human review complete — synthetic evidence accepted for sandbox only",
      });
    expect(approved.status).toBe(201);
    expect(approved.body.provider.status).toBe("APPROVED");
    expect(approved.body.provider.verificationClaim).toBe(false);

    const suspended = await request(app.getHttpServer())
      .post(`/api/v1/admin/compliance/providers/${providerBId}/suspend`)
      .set("Authorization", `Bearer ${compliance}`)
      .send({ reason: "Document discrepancy found during audit" });
    expect(suspended.status).toBe(201);
    expect(suspended.body.provider.status).toBe("SUSPENDED");
  });

  it("supports applicant apply + driver stub without inventing licences", async () => {
    const email = `applicant-${Date.now()}@haramain.local`;
    const apply = await request(app.getHttpServer()).post("/api/v1/providers/applications").send({
      email,
      password: "ApplicantDev!234",
      legalName: "New Applicant LLC",
      registrationNo: "DRAFT-CR-NEW",
    });
    expect(apply.status).toBe(201);
    expect(apply.body.provider.status).toBe("APPLIED");
    expect(apply.body.provider.verificationClaim).toBe(false);

    const token = await login(app, email, "ApplicantDev!234");
    const driver = await request(app.getHttpServer())
      .post("/api/v1/providers/me/drivers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        displayName: "Stub Driver",
        licenceStorageKey: "sandbox://new/licence.pdf",
      });
    expect(driver.status).toBe(201);
    expect(driver.body.active).toBe(false);
    expect(driver.body.message).toMatch(/not verified/i);
  });
});
