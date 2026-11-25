import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

export default defineTool({
  description:
    "Format drafted campaign posts into Admin Marketing queue payloads (titleEn, captionEn/Ar, channels, visualHint).",
  effect: "idempotent",
  execution: "server",
  inputSchema: z.object({
    weekLabel: z.string().min(2).max(80),
    posts: z
      .array(
        z.object({
          day: z.number().int().min(1).max(31),
          themeId: z.string(),
          titleEn: z.string(),
          captionEn: z.string(),
          captionAr: z.string(),
          visualHint: z.string().optional(),
          channels: z.array(z.string()).min(1),
        }),
      )
      .min(1)
      .max(14),
  }),
  dryRunResult: ({ weekLabel }) => ({
    weekLabel,
    liveSocialApi: false as const,
    queueItems: [] as {
      slug: string;
      titleEn: string;
      captionEn: string;
      captionAr: string;
      visualHint: string | null;
      channels: string[];
      status: "DRAFT";
      livePublish: false;
      apiPath: string;
    }[],
    copyPasteNote: "dry-run stub",
  }),
  async execute({ weekLabel, posts }) {
    const queueItems = posts.map((p) => {
      const slugBase = `${weekLabel}-d${p.day}-${p.themeId}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 72);
      return {
        slug: slugBase,
        titleEn: p.titleEn,
        captionEn: p.captionEn,
        captionAr: p.captionAr,
        visualHint: p.visualHint ?? null,
        channels: p.channels.map((c) => c.toUpperCase()),
        status: "DRAFT" as const,
        livePublish: false as const,
        apiPath: "POST /api/v1/admin/marketing/posts",
      };
    });

    return {
      weekLabel,
      liveSocialApi: false as const,
      queueItems,
      copyPasteNote:
        "Paste into Haramain Admin → Marketing, or POST each item to /admin/marketing/posts. Never set livePublish true without Meta tokens + owner approval.",
    };
  },
});
