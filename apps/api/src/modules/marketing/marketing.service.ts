import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MarketingPostStatus, Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";

const ALLOWED_CHANNELS = new Set([
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "X",
  "YOUTUBE",
]);

export type UpsertMarketingPostInput = {
  slug?: string;
  titleEn: string;
  captionEn: string;
  captionAr: string;
  visualHint?: string;
  channels?: string[];
  scheduledAt?: string | null;
  status?: MarketingPostStatus;
};

@Injectable()
export class MarketingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private normalizeChannels(channels?: string[]) {
    const list = (channels?.length ? channels : ["INSTAGRAM", "FACEBOOK"])
      .map((c) => c.trim().toUpperCase())
      .filter((c) => ALLOWED_CHANNELS.has(c));
    if (!list.length) {
      throw new BadRequestException({
        code: "CHANNELS_REQUIRED",
        message: "At least one channel is required",
      });
    }
    return [...new Set(list)].join(",");
  }

  private slugify(title: string) {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    return `${base || "post"}-${randomBytes(2).toString("hex")}`;
  }

  private map(row: {
    id: string;
    slug: string;
    titleEn: string;
    captionEn: string;
    captionAr: string;
    visualHint: string | null;
    channels: string;
    status: MarketingPostStatus;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    sandboxRef: string | null;
    livePublish: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      captionEn: row.captionEn,
      captionAr: row.captionAr,
      visualHint: row.visualHint,
      channels: row.channels.split(",").filter(Boolean),
      status: row.status,
      scheduledAt: row.scheduledAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      sandboxRef: row.sandboxRef,
      livePublish: false as const,
      liveSocialApi: false as const,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      draftLabel: "DRAFT — OWNER APPROVAL REQUIRED" as const,
    };
  }

  async list(status?: MarketingPostStatus) {
    const rows = await this.prisma.marketingPost.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return {
      mode: "sandbox" as const,
      liveSocialApi: false as const,
      data: rows.map((r) => this.map(r)),
      note: "Queue stores owner-approved copy. Sandbox publish does not call Meta/TikTok APIs.",
    };
  }

  async create(user: RequestUser, input: UpsertMarketingPostInput) {
    const slug = (input.slug?.trim() || this.slugify(input.titleEn)).slice(0, 80);
    const status = input.status ?? MarketingPostStatus.DRAFT;
    if (
      status === MarketingPostStatus.PUBLISHED_SANDBOX ||
      status === MarketingPostStatus.CANCELLED
    ) {
      throw new BadRequestException({
        code: "INVALID_STATUS",
        message: "Create as DRAFT, APPROVED, or SCHEDULED",
      });
    }
    const row = await this.prisma.marketingPost.create({
      data: {
        slug,
        titleEn: input.titleEn.trim(),
        captionEn: input.captionEn.trim(),
        captionAr: input.captionAr.trim(),
        visualHint: input.visualHint?.trim() || null,
        channels: this.normalizeChannels(input.channels),
        status,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        createdById: user.id,
        livePublish: false,
      },
    });
    return this.map(row);
  }

  async update(user: RequestUser, id: string, input: UpsertMarketingPostInput) {
    const existing = await this.prisma.marketingPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Post not found" });
    }
    if (existing.status === MarketingPostStatus.PUBLISHED_SANDBOX) {
      throw new BadRequestException({
        code: "LOCKED",
        message: "Published sandbox posts are immutable",
      });
    }
    const data: Prisma.MarketingPostUpdateInput = {
      titleEn: input.titleEn?.trim() ?? existing.titleEn,
      captionEn: input.captionEn?.trim() ?? existing.captionEn,
      captionAr: input.captionAr?.trim() ?? existing.captionAr,
      visualHint:
        input.visualHint !== undefined
          ? input.visualHint?.trim() || null
          : existing.visualHint,
      channels: input.channels
        ? this.normalizeChannels(input.channels)
        : existing.channels,
      scheduledAt:
        input.scheduledAt === undefined
          ? existing.scheduledAt
          : input.scheduledAt
            ? new Date(input.scheduledAt)
            : null,
    };
    if (input.status) {
      data.status = input.status;
      if (input.status === MarketingPostStatus.APPROVED) {
        data.approvedById = user.id;
      }
    }
    const row = await this.prisma.marketingPost.update({ where: { id }, data });
    return this.map(row);
  }

  async approve(user: RequestUser, id: string) {
    const existing = await this.prisma.marketingPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Post not found" });
    }
    if (existing.status === MarketingPostStatus.PUBLISHED_SANDBOX) {
      throw new BadRequestException({ code: "LOCKED", message: "Already published (sandbox)" });
    }
    const row = await this.prisma.marketingPost.update({
      where: { id },
      data: {
        status: existing.scheduledAt
          ? MarketingPostStatus.SCHEDULED
          : MarketingPostStatus.APPROVED,
        approvedById: user.id,
        livePublish: false,
      },
    });
    return this.map(row);
  }

  async schedule(user: RequestUser, id: string, scheduledAt: string) {
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      throw new BadRequestException({
        code: "INVALID_SCHEDULE",
        message: "scheduledAt must be a valid ISO datetime",
      });
    }
    const existing = await this.prisma.marketingPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Post not found" });
    }
    if (existing.status === MarketingPostStatus.PUBLISHED_SANDBOX) {
      throw new BadRequestException({ code: "LOCKED", message: "Already published (sandbox)" });
    }
    const row = await this.prisma.marketingPost.update({
      where: { id },
      data: {
        scheduledAt: when,
        status: MarketingPostStatus.SCHEDULED,
        approvedById: existing.approvedById ?? user.id,
        livePublish: false,
      },
    });
    return this.map(row);
  }

  /** Mark due SCHEDULED posts as PUBLISHED_SANDBOX — never calls live social APIs. */
  async processDue(limit = 20) {
    const now = new Date();
    const due = await this.prisma.marketingPost.findMany({
      where: {
        status: MarketingPostStatus.SCHEDULED,
        scheduledAt: { lte: now },
        livePublish: false,
      },
      orderBy: { scheduledAt: "asc" },
      take: Math.min(Math.max(limit, 1), 50),
    });

    let published = 0;
    for (const post of due) {
      const sandboxRef = `mkt_sandbox_${post.id.slice(0, 8)}_${Date.now().toString(36)}`;
      await this.prisma.$transaction([
        this.prisma.marketingPost.update({
          where: { id: post.id },
          data: {
            status: MarketingPostStatus.PUBLISHED_SANDBOX,
            publishedAt: now,
            sandboxRef,
            livePublish: false,
          },
        }),
        this.prisma.outboxEvent.create({
          data: {
            type: "marketing.post_sandbox",
            payload: {
              postId: post.id,
              slug: post.slug,
              channels: post.channels,
              captionEn: post.captionEn,
              captionAr: post.captionAr,
              sandboxRef,
              liveSocialApi: false,
              message: "Sandbox social publish recorded — not sent to Meta/TikTok/X",
            },
          },
        }),
      ]);
      published += 1;
    }

    const remaining = await this.prisma.marketingPost.count({
      where: {
        status: MarketingPostStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
    });

    return {
      mode: "sandbox" as const,
      liveSocialApi: false as const,
      processed: due.length,
      published,
      remaining,
      message:
        "Due posts marked PUBLISHED_SANDBOX only. Connect Meta/TikTok APIs + owner approval before livePublish.",
    };
  }
}
