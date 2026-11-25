import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { CAMPAIGN_THEMES, HONESTY_RULES } from "../lib/campaign-themes.js";

export default defineTool({
  description:
    "List Haramain Ride pilot-safe marketing campaign themes (corridors, fleet, trust, CTA).",
  effect: "read",
  execution: "server",
  inputSchema: z.object({}),
  async execute() {
    return {
      liveSocialApi: false as const,
      honestyRules: [...HONESTY_RULES],
      themes: CAMPAIGN_THEMES.map((t) => ({
        id: t.id,
        titleEn: t.titleEn,
        titleAr: t.titleAr,
        visualHint: t.visualHint,
        channels: t.channels,
      })),
    };
  },
});
