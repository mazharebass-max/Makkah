import { defineSchedule } from "@grok/agent-sdk/schedules";

/** Mondays 09:00 UTC — propose next week's pilot-safe campaign pack. */
export default defineSchedule({
  cron: "0 9 * * 1",
  markdown:
    "Draft next week's Haramain Ride pilot-safe social campaign. Call list_campaign_themes, then draft_campaign_week for the coming ISO week, then format_for_marketing_queue. Keep liveSocialApi false. Summarize the week pack for the operator to paste into Admin → Marketing. Do not invent social handles or claim live licensed ops.",
});
