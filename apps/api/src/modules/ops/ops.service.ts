import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { loadEnv } from "../../config/env";
import Redis from "ioredis";

export type GateItem = {
  id: string;
  category: string;
  title: string;
  status: "OPEN" | "BLOCKED" | "OWNER_REQUIRED";
  signedOff: false;
  notes: string;
};

@Injectable()
export class OpsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private envFlags() {
    const env = loadEnv();
    const appEnv = process.env.APP_ENV ?? env.NODE_ENV;
    return {
      appEnv,
      nodeEnv: env.NODE_ENV,
      paymentProvider: env.PAYMENT_PROVIDER,
      smsProvider: env.SMS_PROVIDER,
      emailProvider: env.EMAIL_PROVIDER,
      goLiveLocked: (process.env.GO_LIVE_LOCKED ?? "true") !== "false",
      allowLiveProviders: process.env.ALLOW_LIVE_PROVIDERS === "true",
      allowLivePayments: process.env.ALLOW_LIVE_PAYMENTS === "true",
    };
  }

  async checkRedis(): Promise<"ok" | "degraded" | "down"> {
    const url = loadEnv().REDIS_URL;
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 1500,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      return pong === "PONG" ? "ok" : "degraded";
    } catch {
      try {
        await client.quit();
      } catch {
        /* ignore */
      }
      return "down";
    }
  }

  async readiness() {
    const flags = this.envFlags();
    let database: "ok" | "down" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    const redis = await this.checkRedis();
    const sandboxProviders =
      flags.paymentProvider === "sandbox" &&
      flags.smsProvider === "sandbox" &&
      flags.emailProvider === "sandbox";

    const checks = {
      database,
      redis,
      sandboxProviders,
      goLiveLocked: flags.goLiveLocked,
      livePaymentsDisabled: !flags.allowLivePayments,
      liveProvidersDisabled: !flags.allowLiveProviders,
    };

    const stagingReady =
      database === "ok" &&
      sandboxProviders &&
      flags.goLiveLocked &&
      !flags.allowLivePayments &&
      !flags.allowLiveProviders;

    return {
      mode: "staging-hardening" as const,
      appEnv: flags.appEnv,
      stagingReady,
      productionGoLive: false,
      regulatoryClearance: false,
      liveOps: false,
      message:
        "Staging readiness only — not regulatory clearance and not production go-live",
      checks,
      flags: {
        paymentProvider: flags.paymentProvider,
        smsProvider: flags.smsProvider,
        emailProvider: flags.emailProvider,
        goLiveLocked: flags.goLiveLocked,
      },
      proposedSlo: {
        rpoHours: 1,
        rtoHours: 4,
        label: "DRAFT — OWNER APPROVAL REQUIRED",
      },
      time: new Date().toISOString(),
    };
  }

  complianceGate() {
    const items: GateItem[] = [
      {
        id: "legal-entity",
        category: "regulatory",
        title: "Legal entity & permitted commercial activities",
        status: "OWNER_REQUIRED",
        signedOff: false,
        notes: "Owner + counsel — not engineering",
      },
      {
        id: "tga-transport",
        category: "regulatory",
        title: "TGA / transport intermediary & fleet authorizations",
        status: "OWNER_REQUIRED",
        signedOff: false,
        notes: "Never invent verified licences",
      },
      {
        id: "airport-access",
        category: "regulatory",
        title: "JED/MED airport pickup permissions",
        status: "OPEN",
        signedOff: false,
        notes: "Pending owner evidence",
      },
      {
        id: "pdpl",
        category: "privacy",
        title: "PDPL notices, retention, DSR process",
        status: "OWNER_REQUIRED",
        signedOff: false,
        notes: "Privacy review required before live PII",
      },
      {
        id: "vat-zatca",
        category: "tax",
        title: "Principal vs agent + ZATCA e-invoicing",
        status: "OWNER_REQUIRED",
        signedOff: false,
        notes: "Invoices remain DRAFT sandbox labels",
      },
      {
        id: "psp-merchant",
        category: "payments",
        title: "Live PSP merchant onboarding",
        status: "BLOCKED",
        signedOff: false,
        notes: "PAYMENT_PROVIDER=sandbox until signed",
      },
      {
        id: "routes-fares",
        category: "product",
        title: "Real routes/fares/cancellation policies",
        status: "OWNER_REQUIRED",
        signedOff: false,
        notes: "Seeds labeled DRAFT — OWNER APPROVAL REQUIRED",
      },
      {
        id: "security-review",
        category: "security",
        title: "Security review + dependency scan + pen test",
        status: "OPEN",
        signedOff: false,
        notes: "M8 checklist started; pen test not claimed complete",
      },
      {
        id: "dr-drill",
        category: "ops",
        title: "Backup restore / DR drill",
        status: "OPEN",
        signedOff: false,
        notes: "Runbook present; production drill not executed",
      },
      {
        id: "uat-signoff",
        category: "ops",
        title: "UAT + go-live written sign-offs",
        status: "BLOCKED",
        signedOff: false,
        notes: "Hard block until owner signatures",
      },
    ];

    return {
      mode: "compliance-gate" as const,
      regulatoryClearance: false,
      productionGoLive: false,
      liveOps: false,
      signedOffCount: 0,
      total: items.length,
      allSignedOff: false,
      message:
        "No compliance items are signed off. This API never claims legal clearance.",
      items,
      updatedAt: new Date().toISOString(),
    };
  }

  securityChecklist() {
    return {
      mode: "security-checklist" as const,
      productionHardened: false,
      penTestComplete: false,
      liveOps: false,
      controls: [
        { id: "tls", title: "TLS everywhere (staging/prod)", status: "OWNER_REQUIRED" },
        { id: "csp", title: "CSP + security headers on API", status: "IMPLEMENTED_BASELINE" },
        { id: "validation", title: "Request validation whitelist", status: "IMPLEMENTED_BASELINE" },
        { id: "rbac", title: "RBAC + object ownership", status: "IMPLEMENTED_BASELINE" },
        { id: "rate-limit", title: "Auth/OTP rate limits", status: "IMPLEMENTED_BASELINE" },
        { id: "webhook-hmac", title: "Payment webhook HMAC", status: "IMPLEMENTED_BASELINE" },
        { id: "secrets", title: "Secrets manager (non-local)", status: "OWNER_REQUIRED" },
        {
          id: "admin-mfa",
          title: "Admin MFA (TOTP enroll/verify scaffold)",
          status: "IMPLEMENTED_SCAFFOLD",
        },
        { id: "waf", title: "CDN/WAF", status: "OWNER_REQUIRED" },
        { id: "pen-test", title: "External penetration test", status: "OPEN" },
        { id: "dep-scan", title: "Dependency scanning in CI", status: "IMPLEMENTED_BASELINE" },
      ],
      message:
        "Baseline controls only — not a completed security audit or production hardening claim",
    };
  }
}
