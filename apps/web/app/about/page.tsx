import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { t, type Locale } from "../../lib/i18n";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";
import { whatsappDisplay, whatsappE164, whatsappHref } from "../../lib/whatsapp";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "about", locale, pathname: "/about" });
}

export default function AboutPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const wa = whatsappE164();

  return (
    <SiteChrome locale={locale}>
      <article style={{ maxWidth: 720, display: "grid", gap: 22 }}>
        <Badge tone="warning">{t(locale, "pilot")}</Badge>
        <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>{t(locale, "aboutTitle")}</h1>
        <p style={{ margin: 0, color: "#526276", lineHeight: 1.65 }}>{t(locale, "aboutBody")}</p>
        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{t(locale, "aboutMissionTitle")}</h2>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6 }}>{t(locale, "aboutMissionBody")}</p>
        </section>
        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{t(locale, "aboutModelTitle")}</h2>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6 }}>{t(locale, "aboutModelBody")}</p>
        </section>
        <p style={{ margin: 0 }}>
          {wa ? (
            <a
              href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#075E54", fontWeight: 600 }}
            >
              {t(locale, "aboutCta")} · {whatsappDisplay(wa)}
            </a>
          ) : (
            <Link href={`/contact?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
              {t(locale, "contactNav")}
            </Link>
          )}
          {" · "}
          <Link href={`/how-it-works?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
            {t(locale, "howItWorks")}
          </Link>
        </p>
      </article>
    </SiteChrome>
  );
}
