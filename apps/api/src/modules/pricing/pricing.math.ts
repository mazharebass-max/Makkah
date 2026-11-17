import { DRAFT_OWNER_LABEL } from "@haramain/contracts";

export type PriceLine = {
  code: string;
  label: string;
  amountHalalas: number;
  draftLabel: string;
};

/**
 * Build itemized quote lines from a draft base fare.
 * Tax line is a placeholder — never claim ZATCA/VAT determination.
 */
export function buildQuoteLines(input: {
  baseHalalas: number;
  passengers: number;
  luggage: number;
  currency?: string;
}): { lines: PriceLine[]; totalHalalas: number; currency: string } {
  if (input.baseHalalas < 0) {
    throw new Error("baseHalalas must be nonnegative");
  }
  const currency = input.currency ?? "SAR";
  const extraPassengerHalalas =
    input.passengers > 1 ? (input.passengers - 1) * 1_500 : 0;
  const luggageHalalas = input.luggage > 2 ? (input.luggage - 2) * 500 : 0;
  const subtotal = input.baseHalalas + extraPassengerHalalas + luggageHalalas;
  // DRAFT tax placeholder only — owner/counsel must approve treatment
  const taxHalalas = Math.round(subtotal * 0.15);

  const lines: PriceLine[] = [
    {
      code: "BASE",
      label: "Base route fare",
      amountHalalas: input.baseHalalas,
      draftLabel: DRAFT_OWNER_LABEL,
    },
  ];
  if (extraPassengerHalalas > 0) {
    lines.push({
      code: "EXTRA_PASSENGER",
      label: "Additional passengers",
      amountHalalas: extraPassengerHalalas,
      draftLabel: DRAFT_OWNER_LABEL,
    });
  }
  if (luggageHalalas > 0) {
    lines.push({
      code: "LUGGAGE",
      label: "Extra luggage",
      amountHalalas: luggageHalalas,
      draftLabel: DRAFT_OWNER_LABEL,
    });
  }
  lines.push({
    code: "TAX_PLACEHOLDER",
    label: "Tax placeholder (not a legal VAT determination)",
    amountHalalas: taxHalalas,
    draftLabel: DRAFT_OWNER_LABEL,
  });

  const totalHalalas = lines.reduce((s, l) => s + l.amountHalalas, 0);
  return { lines, totalHalalas, currency };
}

export function formatSarFromHalalas(halalas: number): string {
  return `${(halalas / 100).toFixed(2)} SAR`;
}

export const DRAFT_CANCELLATION_POLICY = {
  version: "draft-v0",
  summaryEn:
    "Free cancellation until 24 hours before pickup; fees may apply closer to departure. Final policy requires owner approval.",
  summaryAr:
    "إلغاء مجاني حتى ٢٤ ساعة قبل الموعد؛ قد تُطبق رسوم بعد ذلك. السياسة النهائية تتطلب موافقة المالك.",
  draftLabel: DRAFT_OWNER_LABEL,
} as const;
