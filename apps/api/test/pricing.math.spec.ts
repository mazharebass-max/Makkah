import { describe, expect, it } from "vitest";
import { buildQuoteLines, formatSarFromHalalas } from "../src/modules/pricing/pricing.math";

describe("pricing.math", () => {
  it("builds itemized draft lines with tax placeholder", () => {
    const result = buildQuoteLines({
      baseHalalas: 25_000,
      passengers: 4,
      luggage: 5,
    });
    expect(result.currency).toBe("SAR");
    expect(result.lines.some((l) => l.code === "BASE")).toBe(true);
    expect(result.lines.some((l) => l.code === "TAX_PLACEHOLDER")).toBe(true);
    expect(result.lines.every((l) => l.draftLabel.includes("DRAFT"))).toBe(true);
    expect(result.totalHalalas).toBe(
      result.lines.reduce((s, l) => s + l.amountHalalas, 0),
    );
    expect(result.totalHalalas).toBeGreaterThan(25_000);
  });

  it("keeps single passenger without extra passenger fee", () => {
    const result = buildQuoteLines({ baseHalalas: 10_000, passengers: 1, luggage: 0 });
    expect(result.lines.some((l) => l.code === "EXTRA_PASSENGER")).toBe(false);
    expect(result.lines.find((l) => l.code === "TAX_PLACEHOLDER")?.amountHalalas).toBe(1_500);
  });

  it("formats SAR from halalas", () => {
    expect(formatSarFromHalalas(25350)).toBe("253.50 SAR");
  });
});
