import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { t, type Locale } from "../../lib/i18n";
import { transferSteps } from "../../lib/public-content";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "howItWorks", locale, pathname: "/how-it-works" });
}

export default function HowItWorksPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const steps = transferSteps(locale);
  const included = [
    t(locale, "included1"),
    t(locale, "included2"),
    t(locale, "included3"),
    t(locale, "included4"),
    t(locale, "included5"),
  ];

  return (
    <SiteChrome locale={locale}>
      <article style={{ maxWidth: 720, display: "grid", gap: 24 }}>
        <Badge tone="warning">{t(locale, "pilot")}</Badge>
        <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>{t(locale, "howItWorksHeading")}</h1>
        <p style={{ margin: 0, color: "#526276", lineHeight: 1.6 }}>{t(locale, "howItWorksHint")}</p>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 16 }}>
          {steps.map((s) => (
            <li key={s.title} style={{ display: "grid", gap: 4 }}>
              <strong style={{ color: "#0B1F3A" }}>{s.title}</strong>
              <span style={{ color: "#526276", lineHeight: 1.55 }}>{s.body}</span>
            </li>
          ))}
        </ol>
        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{t(locale, "includedHeading")}</h2>
          <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.7 }}>
            {included.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <p style={{ margin: 0 }}>
          <Link href={`/search?lang=${locale}`} style={{ color: "#174A8B", fontWeight: 600 }}>
            {t(locale, "searchCta")}
          </Link>
          {" · "}
          <Link href={`/contact?lang=${locale}`} style={{ color: "#174A8B", fontWeight: 600 }}>
            {t(locale, "contactNav")}
          </Link>
        </p>
      </article>
    </SiteChrome>
  );
}
