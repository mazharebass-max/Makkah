/** Pilot-safe campaign themes for Haramain Ride. Not live ops claims. */

export type CampaignTheme = {
  id: string;
  titleEn: string;
  titleAr: string;
  visualHint: string;
  channels: string[];
  seedCaptionEn: string;
  seedCaptionAr: string;
};

export const CAMPAIGN_THEMES: CampaignTheme[] = [
  {
    id: "brand-intro",
    titleEn: "Brand intro",
    titleAr: "مقدمة العلامة",
    visualHint: "Brand mark + sand",
    channels: ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
    seedCaptionEn:
      "Haramain Ride — calm private transfers for pilgrims and visitors across Jeddah, Makkah and Madinah. Pilot platform; WhatsApp +966 57 528 4022.",
    seedCaptionAr:
      "حرمين رايد — تنقلات خاصة هادئة لضيوف الرحمن والزوار بين جدة ومكة والمدينة. منصة تجريبية؛ واتساب +966 57 528 4022.",
  },
  {
    id: "jed-makkah",
    titleEn: "Jeddah–Makkah corridor",
    titleAr: "ممر جدة–مكة",
    visualHint: "Airport curb SUV",
    channels: ["INSTAGRAM", "FACEBOOK"],
    seedCaptionEn:
      "Jeddah Airport → Makkah hotels: private SUV corridor with clear seat & luggage classes. Draft planning notes only.",
    seedCaptionAr:
      "مطار جدة → فنادق مكة: ممر خاص بسعة واضحة. ملاحظات تخطيط مسودة فقط.",
  },
  {
    id: "fleet-classes",
    titleEn: "Fleet classes",
    titleAr: "فئات الأسطول",
    visualHint: "Fleet collage",
    channels: ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
    seedCaptionEn:
      "Haram Pak · Staria · Toyota · GMC · Lexus · Mercedes. Pick by passengers and bags. Fares DRAFT — owner approval required.",
    seedCaptionAr:
      "حرم باك · ستاريا · تويوتا · جي إم سي · لكزس · مرسيدس. اختر حسب المسافرين والأمتعة. الأجرة مسودة.",
  },
  {
    id: "how-it-works",
    titleEn: "How it works",
    titleAr: "كيف يعمل",
    visualHint: "4-step graphic",
    channels: ["INSTAGRAM", "FACEBOOK"],
    seedCaptionEn:
      "1) Search corridor 2) Compare class 3) Sandbox checkout 4) Track trip. Live curb dispatch only after go-live sign-off.",
    seedCaptionAr:
      "1) ابحث عن ممر 2) قارن الفئة 3) ادفع تجريبياً 4) تابع الرحلة. التوزيع الحي بعد الإطلاق فقط.",
  },
  {
    id: "trust",
    titleEn: "Trust / verification",
    titleAr: "الثقة والتحقق",
    visualHint: "Verification motif",
    channels: ["INSTAGRAM", "FACEBOOK"],
    seedCaptionEn:
      "Owned fleet first. Partners stay in review until a compliance officer verifies documents. We never invent licences.",
    seedCaptionAr:
      "الأسطول المملوك أولاً. الشركاء قيد المراجعة حتى التحقق. لا نختلق تراخيص.",
  },
  {
    id: "madinah",
    titleEn: "Madinah corridors",
    titleAr: "ممرات المدينة",
    visualHint: "Hotel porte-cochere",
    channels: ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
    seedCaptionEn:
      "MED Airport ↔ Madinah hotels and Makkah ↔ Madinah notes are draft seeds for planning — ask WhatsApp for details.",
    seedCaptionAr:
      "مطار المدينة ↔ فنادق المدينة وممر مكة–المدينة ملاحظات مسودة — اسأل واتساب للتفاصيل.",
  },
  {
    id: "cta",
    titleEn: "WhatsApp + book CTA",
    titleAr: "دعوة واتساب وحجز",
    visualHint: "WhatsApp + site",
    channels: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "X"],
    seedCaptionEn:
      "Book a draft corridor on the site or message WhatsApp +966 57 528 4022. Not live licensed operations yet.",
    seedCaptionAr:
      "احجز ممراً مسودة من الموقع أو واتساب +966 57 528 4022. ليست عمليات مرخّصة مباشرة بعد.",
  },
];

export const HONESTY_RULES = [
  "Always label pilot / draft — never claim live licensed ops",
  "Never invent social handles, reviews, or live curb availability",
  "Sandbox payments only until compliance gate is signed",
  "WhatsApp contact: +966 57 528 4022 (owner-supplied)",
] as const;
