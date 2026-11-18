import type { Metadata } from "next";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../../components/SiteChrome";
import { t } from "../../../lib/i18n";
import { buildPageMetadata, localeFromSearchParams } from "../../../lib/seo";
import { LegalNav } from "../LegalNav";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "legalTerms", locale, pathname: "/legal/terms" });
}

export default function TermsPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale = localeFromSearchParams(searchParams);
  return (
    <SiteChrome locale={locale}>
      <article style={{ maxWidth: 720, display: "grid", gap: 16 }}>
        <LegalNav locale={locale} />
        <Badge tone="warning">{t(locale, "legalDraftBanner")}</Badge>
        <h1 style={{ margin: 0 }}>{t(locale, "terms")}</h1>
        <p style={{ color: "#526276", lineHeight: 1.6 }}>
          {locale === "ar"
            ? "هذه مسودة شروط خدمة لمنصة حرمين رايد التجريبية. ليست عقداً ملزماً وليست موافقة تنظيمية. يجب على المالك ومسؤولي الامتثال اعتماد النص النهائي قبل أي عمليات حية."
            : "This is a draft terms of service for the Haramain Ride pilot platform. It is not a binding commercial contract and does not constitute regulatory approval. The owner and counsel must approve final language before any live operations."}
        </p>
        <ul style={{ color: "#526276", lineHeight: 1.7 }}>
          <li>
            {locale === "ar"
              ? "الحجوزات التجريبية تستخدم محولات دفع/إشعارات تجريبية فقط."
              : "Pilot bookings use sandbox payment and notification adapters only."}
          </li>
          <li>
            {locale === "ar"
              ? "لا ندّعي ترخيص نقل حكومي أو موافقة الهيئة قبل بوابة الامتثال."
              : "We do not claim government transport licensing or TGA clearance before the compliance gate is signed."}
          </li>
          <li>
            {locale === "ar"
              ? "الأسعار والمناطق والفئات موسومة كمسودة وتتطلب موافقة المالك."
              : "Routes, fares, and categories are draft-labeled and require owner approval."}
          </li>
        </ul>
      </article>
    </SiteChrome>
  );
}
