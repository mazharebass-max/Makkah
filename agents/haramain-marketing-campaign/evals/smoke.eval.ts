import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Lists campaign themes via the list_campaign_themes tool.",
  async test(t) {
    await t.send("List the available Haramain marketing campaign themes using your tools.");
    t.succeeded();
    t.calledTool("list_campaign_themes");
  },
});
