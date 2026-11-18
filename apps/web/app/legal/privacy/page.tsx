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
  return buildPageMetadata({ key: "legalPrivacy", locale, pathname: "/legal/privacy" });
}

export default function PrivacyPage({
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
        <h1 style={{ margin: 0 }}>{t(locale, "privacy")}</h1>
        <p style={{ color: "#526276", lineHeight: 1.6 }}>
          {locale === "ar"
            ? "مسودة إشعار خصوصية. تخضع معالجة البيانات لـ PDPL السعودي والمراجعة القانونية قبل الإطلاق. نُقلل الاحتفاظ بموقع السائق الدقيق ونقتصر المشاركة على الرحلات النشطة بموافقة صريحة."
            : "Draft privacy notice. Personal data processing must follow Saudi PDPL and legal review before launch. Precise driver location retention is minimised and limited to active trips with explicit consent."}
        </p>
        <ul style={{ color: "#526276", lineHeight: 1.7 }}>
          <li>
            {locale === "ar"
              ? "لا نزرع بيانات عملاء حقيقية في بيئات التطوير."
              : "We do not seed real customer PII into shared development environments."}
          </li>
          <li>
            {locale === "ar"
              ? "لا نخزن أرقام بطاقات أو رموز CVV."
              : "We never store card PAN or CVV."}
          </li>
          <li>
            {locale === "ar"
              ? "طلبات الوصول/التصحيح ستُدار بعد تعيين مسؤول الامتثال."
              : "Access/correction requests will be handled once a compliance owner is assigned."}
          </li>
        </ul>
      </article>
    </SiteChrome>
  );
}
