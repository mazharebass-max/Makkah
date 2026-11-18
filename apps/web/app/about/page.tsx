import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { BrandLockup } from "../../components/BrandLogo";
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
  const waHref = wa ? whatsappHref(wa, t(locale, "whatsappPrefill")) : null;

  const sections = [
    { title: t(locale, "aboutWhoTitle"), body: t(locale, "aboutWhoBody") },
    { title: t(locale, "aboutWhereTitle"), body: t(locale, "aboutWhereBody") },
    { title: t(locale, "aboutMissionTitle"), body: t(locale, "aboutMissionBody") },
    { title: t(locale, "aboutModelTitle"), body: t(locale, "aboutModelBody") },
  ] as const;

  return (
    <SiteChrome locale={locale}>
      <article style={{ maxWidth: 720, display: "grid", gap: 28 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <BrandLockup brand={t(locale, "brand")} tagline={t(locale, "tagline")} markSize={48} />
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)", letterSpacing: "-0.03em" }}>
            {t(locale, "aboutTitle")}
          </h1>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.65, fontSize: 17 }}>{t(locale, "aboutBody")}</p>
        </div>

        <div
          style={{
            overflow: "hidden",
            borderRadius: 16,
            background: "#E8EDF5",
            aspectRatio: "21 / 9",
          }}
        >
          <Image
            src="/places/makkah-haram-skyline.jpg"
            alt={locale === "ar" ? "أفق الحرم في مكة" : "Makkah Haram-area skyline"}
            width={1200}
            height={514}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            priority
          />
        </div>

        {sections.map((s) => (
          <section key={s.title} style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20, color: "#0B1F3A" }}>{s.title}</h2>
            <p style={{ margin: 0, color: "#526276", lineHeight: 1.65 }}>{s.body}</p>
          </section>
        ))}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            paddingTop: 8,
            borderTop: "1px solid rgba(11,31,58,0.1)",
          }}
        >
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 11,
                background: "#25D366",
                color: "#063B2D",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              {t(locale, "aboutCta")} · {whatsappDisplay(wa!)}
            </a>
          ) : (
            <Link href={`/contact?lang=${locale}`} style={{ fontWeight: 700, color: "#1A5FBF" }}>
              {t(locale, "contactNav")}
            </Link>
          )}
          <Link href={`/?lang=${locale}#book`} style={{ fontWeight: 600, color: "#1A5FBF" }}>
            {t(locale, "searchCta")}
          </Link>
          <Link href={`/how-it-works?lang=${locale}`} style={{ fontWeight: 600, color: "#1A5FBF" }}>
            {t(locale, "howItWorks")}
          </Link>
        </div>
      </article>
    </SiteChrome>
  );
}
