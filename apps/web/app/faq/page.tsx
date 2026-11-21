import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { t, type Locale } from "../../lib/i18n";
import { publicFaqs } from "../../lib/public-content";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "faq", locale, pathname: "/faq" });
}

export default function FaqPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const faqs = publicFaqs(locale);

  return (
    <SiteChrome locale={locale}>
      <article style={{ maxWidth: 720, display: "grid", gap: 20 }}>
        <Badge tone="warning">{t(locale, "pilot")}</Badge>
        <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>{t(locale, "faqHeading")}</h1>
        <dl style={{ margin: 0, display: "grid", gap: 16 }}>
          {faqs.map((f) => (
            <div key={f.q}>
              <dt style={{ fontWeight: 700 }}>{f.q}</dt>
              <dd style={{ margin: "6px 0 0", color: "#526276", lineHeight: 1.6 }}>{f.a}</dd>
            </div>
          ))}
        </dl>
        <p style={{ margin: 0 }}>
          <Link href={`/contact?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
            {t(locale, "contactNav")}
          </Link>
          {" · "}
          <Link href={`/search?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
            {t(locale, "searchCta")}
          </Link>
        </p>
      </article>
    </SiteChrome>
  );
}
