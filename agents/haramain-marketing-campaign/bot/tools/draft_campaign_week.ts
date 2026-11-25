import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { CAMPAIGN_THEMES, HONESTY_RULES } from "../lib/campaign-themes.js";

export default defineTool({
  description:
    "Draft a bilingual 7-day (or shorter) campaign pack from pilot-safe themes. Does not post to Meta/TikTok.",
  effect: "idempotent",
  execution: "server",
  inputSchema: z.object({
    weekLabel: z
      .string()
      .min(2)
      .max(80)
      .describe("Human label for this week, e.g. 2026-W48"),
    themeIds: z
      .array(z.string())
      .min(1)
      .max(7)
      .optional()
      .describe("Optional theme ids; defaults to full 7-day pack order"),
    focusRoute: z
      .string()
      .max(64)
      .optional()
      .describe("Optional corridor code to mention, e.g. JED-MAKKAH"),
  }),
  dryRunResult: ({ weekLabel }) => ({
    weekLabel,
    liveSocialApi: false as const,
    postCount: 0,
    posts: [] as {
      day: number;
      themeId: string;
      titleEn: string;
      titleAr: string;
      visualHint: string;
      channels: string[];
      captionEn: string;
      captionAr: string;
      statusSuggestion: "SCHEDULED";
      livePublish: false;
    }[],
    honestyRules: [...HONESTY_RULES],
    nextStep: "dry-run stub",
  }),
  async execute({ weekLabel, themeIds, focusRoute }) {
    const selected = themeIds?.length
      ? themeIds
          .map((id) => CAMPAIGN_THEMES.find((t) => t.id === id))
          .filter((t): t is (typeof CAMPAIGN_THEMES)[number] => Boolean(t))
      : CAMPAIGN_THEMES.slice(0, 7);

    if (!selected.length) {
      return {
        weekLabel,
        liveSocialApi: false as const,
        posts: [],
        honestyRules: [...HONESTY_RULES],
        error: "No matching theme ids",
      };
    }

    const routeNote = focusRoute
      ? ` Corridor focus: ${focusRoute.toUpperCase()} (draft).`
      : "";

    const posts = selected.map((t, i) => ({
      day: i + 1,
      themeId: t.id,
      titleEn: t.titleEn,
      titleAr: t.titleAr,
      visualHint: t.visualHint,
      channels: t.channels,
      captionEn: `${t.seedCaptionEn}${routeNote}`.trim(),
      captionAr: t.seedCaptionAr,
      statusSuggestion: "SCHEDULED" as const,
      livePublish: false as const,
    }));

    return {
      weekLabel,
      liveSocialApi: false as const,
      postCount: posts.length,
      posts,
      honestyRules: [...HONESTY_RULES],
      nextStep:
        "Use format_for_marketing_queue, then paste into Admin → Marketing or schedule via Haramain API.",
    };
  },
});
