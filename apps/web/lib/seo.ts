import type { Metadata } from "next";
import type { Locale } from "./i18n";

/** Public site origin — set NEXT_PUBLIC_SITE_URL in staging/production. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type SeoPageKey =
  | "home"
  | "search"
  | "contact"
  | "legalTerms"
  | "legalPrivacy"
  | "legalCancellation"
  | "providerApply";

const copy: Record<
  SeoPageKey,
  Record<Locale, { title: string; description: string }>
> = {
  home: {
    en: {
      title: "Haramain Ride — Premium pilgrim ground transport",
      description:
        "Pilot booking platform for private transfers across Jeddah, Makkah and Madinah. Owned fleet plus third-party partners only after human verification. Not live licensed operations.",
    },
    ar: {
      title: "حرمين رايد — نقل أرضي راقٍ لضيوف الرحمن",
      description:
        "منصة تجريبية لحجز التنقلات الخاصة بين جدة ومكة والمدينة. أسطول مملوك وشركاء طرف ثالث بعد التحقق البشري فقط. ليست عمليات مرخّصة مباشرة.",
    },
  },
  search: {
    en: {
      title: "Search vehicles — Haramain Ride",
      description:
        "Compare draft vehicle categories and capacity for launch corridors. Availability comes from synthetic seed inventory — never invented live supply.",
    },
    ar: {
      title: "البحث عن مركبات — حرمين رايد",
      description:
        "قارن فئات المركبات والسعة لممرات الإطلاق. التوفر من مخزون تجريبي — لا نختلق عرضاً حياً.",
    },
  },
  contact: {
    en: {
      title: "Contact & follow — Haramain Ride",
      description:
        "WhatsApp contact for Haramain Ride corridor questions. Social profile links appear when the owner publishes real pages. Pilot platform — not live licensed operations.",
    },
    ar: {
      title: "تواصل ومتابعة — حرمين رايد",
      description:
        "تواصل واتساب لأسئلة ممرات حرمين رايد. تظهر روابط الحسابات عند نشر المالك لصفحات حقيقية. منصة تجريبية — ليست عمليات مرخّصة مباشرة.",
    },
  },
  legalTerms: {
    en: {
      title: "Terms of service (draft) — Haramain Ride",
      description:
        "Draft terms for the Haramain Ride pilot. Not a binding commercial contract and not regulatory approval. Owner and counsel must approve before live operations.",
    },
    ar: {
      title: "شروط الخدمة (مسودة) — حرمين رايد",
      description:
        "مسودة شروط لمنصة حرمين رايد التجريبية. ليست عقداً ملزماً وليست موافقة تنظيمية. يجب اعتماد النص قبل أي عمليات حية.",
    },
  },
  legalPrivacy: {
    en: {
      title: "Privacy notice (draft) — Haramain Ride",
      description:
        "Draft privacy notice for the pilot platform. PDPL review and owner approval required before launch. No card PAN/CVV storage.",
    },
    ar: {
      title: "إشعار الخصوصية (مسودة) — حرمين رايد",
      description:
        "مسودة إشعار خصوصية للمنصة التجريبية. مراجعة PDPL وموافقة المالك مطلوبة قبل الإطلاق. لا نخزن أرقام بطاقات أو CVV.",
    },
  },
  legalCancellation: {
    en: {
      title: "Cancellation & refunds (draft) — Haramain Ride",
      description:
        "Draft cancellation and refund policy shown at checkout. Cutoffs, fees, and tax treatment require owner approval before live capture.",
    },
    ar: {
      title: "الإلغاء والاسترداد (مسودة) — حرمين رايد",
      description:
        "مسودة سياسة الإلغاء والاسترداد المعروضة عند الدفع. الحدود الزمنية والرسوم تتطلب موافقة المالك قبل التحصيل الحي.",
    },
  },
  providerApply: {
    en: {
      title: "Become a transport provider — Haramain Ride",
      description:
        "Apply to join as a third-party provider. Applications start as APPLIED; compliance officers verify documents. We never invent approved licences.",
    },
    ar: {
      title: "كن مزود نقل — حرمين رايد",
      description:
        "قدّم طلباً للانضمام كمزود طرف ثالث. تبدأ الطلبات بحالة APPLIED ويتحقق مسؤول الامتثال من المستندات. لا نختلق تراخيص معتمدة.",
    },
  },
};

export function localeFromSearchParams(searchParams?: {
  lang?: string | string[];
}): Locale {
  const raw = Array.isArray(searchParams?.lang)
    ? searchParams?.lang[0]
    : searchParams?.lang;
  return raw === "ar" ? "ar" : "en";
}

export function absoluteUrl(pathname: string, locale?: Locale): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const base = `${siteUrl()}${path === "/" ? "" : path}`;
  if (!locale) return base || siteUrl();
  const joiner = base.includes("?") ? "&" : "?";
  return `${base || siteUrl()}${joiner}lang=${locale}`;
}

export function buildPageMetadata(input: {
  key: SeoPageKey;
  locale: Locale;
  pathname: string;
  index?: boolean;
}): Metadata {
  const { key, locale, pathname, index = true } = input;
  const page = copy[key][locale];
  const canonical = absoluteUrl(pathname, locale);
  const otherLocale: Locale = locale === "en" ? "ar" : "en";

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical,
      languages: {
        en: absoluteUrl(pathname, "en"),
        ar: absoluteUrl(pathname, "ar"),
        "x-default": absoluteUrl(pathname, "en"),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: otherLocale === "ar" ? ["ar_SA"] : ["en_US"],
      url: canonical,
      siteName: "Haramain Ride",
      title: page.title,
      description: page.description,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

/** Private / transactional flows — keep out of search indexes. */
export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
  openGraph: {
    title: "Haramain Ride",
    description: "Private account or checkout flow — not for search indexing.",
  },
};

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Haramain Ride",
    url: siteUrl(),
    description:
      "Pilot pilgrim and tourism ground-transport booking platform serving Jeddah, Makkah and Madinah. Not a claim of live licensed operations.",
    areaServed: ["Jeddah", "Makkah", "Madinah"],
  };
}

export function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Haramain Ride private transfers",
    provider: {
      "@type": "Organization",
      name: "Haramain Ride",
    },
    areaServed: ["Jeddah", "Makkah", "Madinah"],
    description:
      "Private airport and intercity transfers. Pilot platform with draft fares; third-party partners require human compliance verification. No guaranteed live availability.",
    // Intentionally omit AggregateRating / offers with invented availability
  };
}

export function faqJsonLd(locale: Locale) {
  const faqs =
    locale === "ar"
      ? [
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
        ]
      : [
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
        ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
