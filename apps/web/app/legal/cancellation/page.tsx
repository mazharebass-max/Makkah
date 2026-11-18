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
  return buildPageMetadata({
    key: "legalCancellation",
    locale,
    pathname: "/legal/cancellation",
  });
}

export default function CancellationPage({
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
        <h1 style={{ margin: 0 }}>{t(locale, "cancelPolicy")}</h1>
        <p style={{ color: "#526276", lineHeight: 1.6 }}>
          {locale === "ar"
            ? "سياسة الإلغاء والاسترداد مسودة وتعرض أثناء الدفع. الرسوم والحدود الزمنية والنطاق الضريبي تتطلب موافقة المالك قبل التحصيل الحي."
            : "Cancellation and refund rules are draft and shown at checkout. Cutoffs, fees, and tax treatment require owner approval before live capture."}
        </p>
        <ul style={{ color: "#526276", lineHeight: 1.7 }}>
          <li>
            {locale === "ar"
              ? "الحجوزات التجريبية يمكن إلغاؤها عبر واجهة API مع تحديث الحالة."
              : "Pilot bookings can be cancelled via the API with audited status updates."}
          </li>
          <li>
            {locale === "ar"
              ? "الاسترداد التجريبي يسجّل في دفتر الأستاذ دون ادعاء نجاح بوابة حية."
              : "Sandbox refunds update the ledger without claiming live PSP success."}
          </li>
          <li>
            {locale === "ar"
              ? "تجاوزات الدعم يجب أن تُراجع وتُسجّل."
              : "Support overrides must be audited."}
          </li>
        </ul>
      </article>
    </SiteChrome>
  );
}
