import { t, type Locale } from "./i18n";

export const fleetRows = [
  {
    code: "SEDAN",
    src: "/vehicles/haram-pack-suv.jpg",
    labelKey: "fleetHaramPack" as const,
    capKey: "fleetCapHaramPack" as const,
    bodyKey: "fleetBodyHaramPack" as const,
    passengers: 6,
    luggage: 8,
    altEn: "Haram Pak SUV at an airport arrival curb with luggage trolley",
    altAr: "سيارة حرم باك عند رصيف المطار مع عربة أمتعة",
  },
  {
    code: "VAN",
    src: "/vehicles/hyundai-staria-highroof.jpg",
    labelKey: "fleetStaria" as const,
    capKey: "fleetCapStaria" as const,
    bodyKey: "fleetBodyStaria" as const,
    passengers: 7,
    luggage: 10,
    altEn: "Hyundai Staria high-roof MPV for family pilgrim transfers",
    altAr: "هيونداي ستاريا سقف مرتفع لعائلات الحجاج والزوار",
  },
  {
    code: "TOYOTA_ALPHARD",
    src: "/vehicles/toyota-alphard-class.jpg",
    labelKey: "fleetToyota" as const,
    capKey: "fleetCapToyota" as const,
    bodyKey: "fleetBodyToyota" as const,
    passengers: 6,
    luggage: 6,
    altEn: "Toyota Alphard-class luxury MPV",
    altAr: "تويوتا ألفارد فاخرة",
  },
  {
    code: "GMC_CLASS",
    src: "/vehicles/gmc-class-suv.jpg",
    labelKey: "fleetGmc" as const,
    capKey: "fleetCapGmc" as const,
    bodyKey: "fleetBodyGmc" as const,
    passengers: 7,
    luggage: 8,
    altEn: "GMC-class SUV on a desert highway corridor",
    altAr: "سيارة فئة جي إم سي على طريق صحراوي",
  },
  {
    code: "LEXUS_CLASS",
    src: "/vehicles/lexus-class-suv.jpg",
    labelKey: "fleetLexus" as const,
    capKey: "fleetCapLexus" as const,
    bodyKey: "fleetBodyLexus" as const,
    passengers: 4,
    luggage: 4,
    altEn: "Lexus-class SUV at a hotel porte-cochere",
    altAr: "سيارة فئة لكزس أمام مدخل فندق",
  },
  {
    code: "MERCEDES_V",
    src: "/vehicles/mercedes-v-class.jpg",
    labelKey: "fleetMercedes" as const,
    capKey: "fleetCapMercedes" as const,
    bodyKey: "fleetBodyMercedes" as const,
    passengers: 7,
    luggage: 7,
    altEn: "Mercedes-Benz V-Class luxury people carrier",
    altAr: "مرسيدس في-كلاس فاخرة",
  },
] as const;

export function fleetByCode(code: string) {
  const upper = code.toUpperCase();
  return fleetRows.find((r) => r.code === upper) ?? null;
}

/** Corridor place/vehicle stills — Haram Pak for airport legs, Madinah / Makkah place photos where the route needs them. */
export function corridorVisual(code: string): {
  src: string;
  altEn: string;
  altAr: string;
} {
  const c = code.toUpperCase();
  if (c.includes("MADINAH") || c.includes("MED-") || c.endsWith("MED")) {
    return {
      src: "/places/madinah-nabawi.jpg",
      altEn: "Al-Masjid an-Nabawi in Madinah — corridor context photo",
      altAr: "المسجد النبوي في المدينة — صورة سياق للممر",
    };
  }
  if (c.includes("MAKKAH") && !c.includes("JED")) {
    return {
      src: "/places/makkah-haram-skyline.jpg",
      altEn: "Makkah skyline near the Haram — corridor context photo",
      altAr: "أفق مكة قرب الحرم — صورة سياق للممر",
    };
  }
  if (c.includes("JED") || c.includes("JEDDAH") || c.includes("MAKKAH")) {
    return {
      src: "/vehicles/haram-pack-suv.jpg",
      altEn: "Haram Pak SUV ready for Jeddah–Makkah airport transfer",
      altAr: "سيارة حرم باك جاهزة لنقل مطار جدة–مكة",
    };
  }
  return {
    src: "/vehicles/haram-pack-suv.jpg",
    altEn: "Haram Pak SUV for Haramain corridor transfers",
    altAr: "سيارة حرم باك لتنقلات ممرات الحرمين",
  };
}

export const placeHighlights = [
  {
    src: "/vehicles/haram-pack-suv.jpg",
    titleKey: "placeHaramPackTitle" as const,
    bodyKey: "placeHaramPackBody" as const,
    altEn: "Haram Pak SUV at an airport arrival curb",
    altAr: "سيارة حرم باك عند رصيف المطار",
  },
  {
    src: "/places/madinah-nabawi.jpg",
    titleKey: "placeMadinahTitle" as const,
    bodyKey: "placeMadinahBody" as const,
    altEn: "Al-Masjid an-Nabawi in Madinah",
    altAr: "المسجد النبوي في المدينة",
  },
  {
    src: "/places/makkah-haram-skyline.jpg",
    titleKey: "placeMakkahTitle" as const,
    bodyKey: "placeMakkahBody" as const,
    altEn: "Makkah skyline near the Haram",
    altAr: "أفق مكة قرب الحرم",
  },
] as const;

export function transferSteps(locale: Locale) {
  return [
    { title: t(locale, "transferStep1Title"), body: t(locale, "transferStep1Body") },
    { title: t(locale, "transferStep2Title"), body: t(locale, "transferStep2Body") },
    { title: t(locale, "transferStep3Title"), body: t(locale, "transferStep3Body") },
    { title: t(locale, "transferStep4Title"), body: t(locale, "transferStep4Body") },
  ];
}

export function corridorOps(locale: Locale) {
  return [
    {
      codes: ["JED-MAKKAH", "JEDDAH-MAKKAH"],
      titleEn: "JED Airport ↔ Makkah hotels",
      titleAr: "مطار جدة ↔ فنادق مكة",
      pickup: t(locale, "corridorJedMakkahPickup"),
      dropoff: t(locale, "corridorJedMakkahDropoff"),
      duration: t(locale, "corridorJedMakkahDuration"),
      note: t(locale, "corridorJedMakkahNote"),
    },
    {
      codes: ["MAKKAH-MADINAH"],
      titleEn: "Makkah ↔ Madinah",
      titleAr: "مكة ↔ المدينة",
      pickup: t(locale, "corridorMakkahMadinahPickup"),
      dropoff: t(locale, "corridorMakkahMadinahDropoff"),
      duration: t(locale, "corridorMakkahMadinahDuration"),
      note: t(locale, "corridorMakkahMadinahNote"),
    },
    {
      codes: ["MED-MADINAH"],
      titleEn: "MED Airport ↔ Madinah hotels",
      titleAr: "مطار المدينة ↔ فنادق المدينة",
      pickup: t(locale, "corridorMedMadinahPickup"),
      dropoff: t(locale, "corridorMedMadinahDropoff"),
      duration: t(locale, "corridorMedMadinahDuration"),
      note: t(locale, "corridorMedMadinahNote"),
    },
  ];
}

export function publicFaqs(locale: Locale): Array<{ q: string; a: string }> {
  if (locale === "ar") {
    return [
      {
        q: "هل المنصة تعمل بترخيص حي الآن؟",
        a: "لا. هذه منصة تجريبية. الإطلاق الحي يتطلب موافقات الامتثال والمالك المكتوبة.",
      },
      {
        q: "هل يتم اعتماد مزودي الطرف الثالث تلقائياً؟",
        a: "لا. الطلبات تبدأ بحالة APPLIED ويراجعها مسؤول امتثال مع المستندات.",
      },
      {
        q: "هل الدفع حي؟",
        a: "التطوير يستخدم محول دفع تجريبي فقط ولا يدّعي تحصيل بوابة حية.",
      },
      {
        q: "كيف أتواصل للحجز؟",
        a: "استخدم واتساب من صفحة التواصل أو ابدأ بحث ممر من الموقع. الردود خلال النهار بتوقيت آسيا/الرياض (مسودة).",
      },
      {
        q: "هل الأسعار نهائية؟",
        a: "لا. أسعار الكتالوج مسودة وتتطلب موافقة المالك قبل أي تحصيل حي.",
      },
      {
        q: "ماذا لو تأخرت رحلتي الجوية؟",
        a: "أضف رقم الرحلة عند الدفع التجريبي إن أمكن. نوافذ الانتظار ورسوم التمديد مسودة وتتطلب موافقة المالك — لا نَدّعي تتبعاً حياً للرحلات.",
      },
      {
        q: "هل أختار نقطة التقاء في المطار؟",
        a: "نعم اختيارياً من نقاط الالتقاء المسودة (مثل صالات جدة). ليست عمليات التقاط مرخّصة مباشرة.",
      },
    ];
  }
  return [
    {
      q: "Is Haramain Ride live-licensed today?",
      a: "No. This is a pilot platform. Live operations require written compliance and owner sign-offs.",
    },
    {
      q: "Are third-party providers auto-approved?",
      a: "No. Applications start as APPLIED and a compliance officer reviews documents.",
    },
    {
      q: "Is payment live?",
      a: "Development uses a sandbox payment adapter only and never claims a live gateway capture.",
    },
    {
      q: "How do I contact you to book?",
      a: "Use WhatsApp from the Contact page or start a corridor search on the site. Pilot replies aim for Asia/Riyadh daytime (draft hours).",
    },
    {
      q: "Are fares final?",
      a: "No. Catalog fares are DRAFT and require owner approval before any live capture.",
    },
    {
      q: "What if my flight is delayed?",
      a: "Add your flight number at sandbox checkout when you can. Waiting windows and extended-wait fees stay DRAFT pending owner approval — we do not claim live flight tracking.",
    },
    {
      q: "Can I choose an airport meeting point?",
      a: "Yes, optionally from draft pickup points (for example Jeddah terminals). These are planning seeds — not live licensed curb operations.",
    },
  ];
}
