import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { loadEnv } from "../../config/env";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";

const DRAFT = "DRAFT — OWNER APPROVAL REQUIRED";

/** Seeded flag keys — all default false; env go-live lock remains authoritative. */
export const DEFAULT_FEATURE_FLAGS: { key: string; description: string }[] = [
  { key: "allow_live_payments", description: "Advisory only — env ALLOW_LIVE_PAYMENTS still gates capture" },
  { key: "allow_live_providers", description: "Advisory only — never auto-approve licences" },
  { key: "public_promotions", description: "Show promotional surfaces (default off)" },
  { key: "experimental_ui", description: "Experimental customer UI experiments (default off)" },
];

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    for (const flag of DEFAULT_FEATURE_FLAGS) {
      await this.prisma.featureFlag.upsert({
        where: { key: flag.key },
        create: {
          key: flag.key,
          enabled: false,
          description: flag.description,
          draftLabel: DRAFT,
        },
        update: {},
      });
    }
    await this.prisma.systemSetting.upsert({
      where: { key: "support_contact" },
      create: {
        key: "support_contact",
        valueJson: { email: "support@haramain.local", mode: "sandbox" },
        draftLabel: DRAFT,
      },
      update: {},
    });
    await this.prisma.systemSetting.upsert({
      where: { key: "default_locale" },
      create: {
        key: "default_locale",
        valueJson: { locale: "en", alternate: "ar" },
        draftLabel: DRAFT,
      },
      update: {},
    });
  }

  async listFeatureFlagsPublic() {
    await this.ensureDefaults();
    const env = loadEnv();
    const rows = await this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return {
      mode: "sandbox" as const,
      productionGoLive: false,
      regulatoryClearance: false,
      liveOps: false,
      message: "Feature flags default off — env go-live lock remains authoritative",
      goLiveLocked: env.GO_LIVE_LOCKED,
      allowLivePaymentsEnv: env.ALLOW_LIVE_PAYMENTS,
      data: rows.map((f) => ({
        key: f.key,
        enabled: f.enabled,
        description: f.description,
        draftLabel: f.draftLabel,
      })),
    };
  }

  async listFeatureFlagsAdmin() {
    return this.listFeatureFlagsPublic();
  }

  async setFeatureFlag(user: RequestUser, key: string, enabled: boolean) {
    await this.ensureDefaults();
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException({ code: "NOT_FOUND", message: `Unknown feature flag: ${key}` });
    }
    // Never allow DB flags to imply live go-live; refuse enabling live_* when env locked.
    const env = loadEnv();
    if (enabled && (key === "allow_live_payments" || key === "allow_live_providers")) {
      if (env.GO_LIVE_LOCKED || !env.ALLOW_LIVE_PAYMENTS) {
        throw new BadRequestException({
          code: "GO_LIVE_LOCKED",
          message:
            "Cannot enable live_* feature flags while GO_LIVE_LOCKED or live env flags remain off — productionGoLive stays false",
        });
      }
    }

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "settings.feature_flag.set",
        resource: "feature_flag",
        resourceId: updated.id,
        metadata: { key, enabled, productionGoLive: false },
      },
    });
    return {
      ok: true,
      mode: "sandbox" as const,
      productionGoLive: false,
      flag: {
        key: updated.key,
        enabled: updated.enabled,
        draftLabel: updated.draftLabel,
      },
    };
  }

  async listSystemSettings() {
    await this.ensureDefaults();
    const rows = await this.prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
    return {
      mode: "sandbox" as const,
      productionGoLive: false,
      message: "System settings are draft operational scaffolding — not go-live clearance",
      data: rows.map((s) => ({
        key: s.key,
        value: s.valueJson,
        draftLabel: s.draftLabel,
        updatedAt: s.updatedAt.toISOString(),
      })),
    };
  }

  async putSystemSetting(user: RequestUser, key: string, value: unknown) {
    if (value === undefined) {
      throw new BadRequestException({ code: "INVALID", message: "value required" });
    }
    const updated = await this.prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        valueJson: value as Prisma.InputJsonValue,
        draftLabel: DRAFT,
      },
      update: {
        valueJson: value as Prisma.InputJsonValue,
      },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "settings.system.put",
        resource: "system_setting",
        resourceId: updated.id,
        metadata: { key, productionGoLive: false },
      },
    });
    return {
      ok: true,
      mode: "sandbox" as const,
      productionGoLive: false,
      setting: {
        key: updated.key,
        value: updated.valueJson,
        draftLabel: updated.draftLabel,
      },
    };
  }

  async listPickupPoints(zoneCode?: string) {
    const rows = await this.prisma.pickupPoint.findMany({
      where: {
        active: true,
        ...(zoneCode ? { zone: { code: zoneCode } } : {}),
      },
      include: { zone: { select: { code: true, nameEn: true, nameAr: true } } },
      orderBy: { code: "asc" },
    });
    return {
      mode: "sandbox" as const,
      liveOps: false,
      message: "Draft pickup points only — not live licensed meeting points",
      data: rows.map((p) => ({
        id: p.id,
        code: p.code,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        kind: p.kind,
        draftLabel: p.draftLabel,
        note: p.note,
        zone: p.zone,
      })),
    };
  }
}
