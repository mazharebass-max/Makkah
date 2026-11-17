export type Locale = "en" | "ar";

export const messages = {
  en: {
    brand: "Haramain Ride",
    tagline: "Premium pilgrim ground transport",
    pilot: "Pilot platform · not live licensed operations",
    heroTitle: "Haramain Ride",
    heroBody:
      "Calm, credible transfers across Jeddah, Makkah and Madinah — owned fleet plus verified partners when approved.",
    searchCta: "Find vehicles",
    howItWorks: "How verification works",
    routes: "Launch corridors",
    routesHint: "Fares and activation require owner approval. Synthetic seed data only.",
    signIn: "Sign in",
    from: "From / route",
    when: "Pickup (Asia/Riyadh local shown as ISO)",
    passengers: "Passengers",
    luggage: "Luggage",
    draft: "DRAFT — OWNER APPROVAL REQUIRED",
    available: "Available (seed inventory)",
    unavailable: "Unavailable",
    noInventory: "No eligible vehicles in the database for this category",
    capacity: "Does not fit passengers/luggage",
    select: "Select & quote",
    checkout: "Checkout",
    contact: "Contact details",
    phone: "Phone",
    name: "Full name",
    terms: "I accept the draft terms and cancellation policy",
    paySandbox: "Continue to sandbox payment",
    sandboxOnly: "Sandbox only — not a live payment capture",
    cancellation: "Cancellation policy",
    priceBreakdown: "Price breakdown",
    emptySearch: "No categories returned. Check API connectivity.",
    inventoryNote: "Availability is from synthetic owned-fleet rows — never invent live supply.",
    language: "العربية",
    steps: "How it works",
    step1: "Search a launch corridor and time",
    step2: "Compare vehicle capacity and draft pricing",
    step3: "Sign in, confirm contacts, sandbox checkout",
    safety: "Verification",
    safetyBody:
      "Third-party providers stay in review until a compliance officer verifies documents. We never invent approved licences.",
  },
  ar: {
    brand: "حرمين رايد",
    tagline: "نقل أرضي راقٍ لضيوف الرحمن",
    pilot: "منصة تجريبية · ليست عمليات مرخّصة مباشرة",
    heroTitle: "حرمين رايد",
    heroBody:
      "تنقلات هادئة وموثوقة بين جدة ومكة والمدينة — أسطول مملوك وشركاء معتمدون بعد التحقق.",
    searchCta: "ابحث عن مركبات",
    howItWorks: "كيف يعمل التحقق",
    routes: "ممرات الإطلاق",
    routesHint: "الأسعار والتفعيل يتطلبان موافقة المالك. بيانات تجريبية فقط.",
    signIn: "تسجيل الدخول",
    from: "المسار",
    when: "موعد الانطلاق",
    passengers: "المسافرون",
    luggage: "الأمتعة",
    draft: "مسودة — تتطلب موافقة المالك",
    available: "متاح (مخزون تجريبي)",
    unavailable: "غير متاح",
    noInventory: "لا توجد مركبات مؤهلة في قاعدة البيانات لهذه الفئة",
    capacity: "لا تناسب عدد المسافرين/الأمتعة",
    select: "اختيار وعرض السعر",
    checkout: "إتمام الحجز",
    contact: "بيانات التواصل",
    phone: "الهاتف",
    name: "الاسم الكامل",
    terms: "أوافق على الشروط المسودة وسياسة الإلغاء",
    paySandbox: "المتابعة إلى دفع تجريبي",
    sandboxOnly: "وضع تجريبي فقط — ليس تحصيل دفع حقيقي",
    cancellation: "سياسة الإلغاء",
    priceBreakdown: "تفاصيل السعر",
    emptySearch: "لا توجد فئات. تحقق من اتصال الواجهة البرمجية.",
    inventoryNote: "التوفر من صفوف الأسطول المملوك التجريبية — لا نختلق عرضاً حياً.",
    language: "English",
    steps: "كيف يعمل",
    step1: "ابحث عن ممر ووقت",
    step2: "قارن السعة والأسعار المسودة",
    step3: "سجّل الدخول وأكمل الدفع التجريبي",
    safety: "التحقق",
    safetyBody:
      "يبقى مزودو الطرف الثالث قيد المراجعة حتى يتحقق مسؤول الامتثال من المستندات. لا نختلق تراخيص معتمدة.",
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key];
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "ar" : "en";
}
