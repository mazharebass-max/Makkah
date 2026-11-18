import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookingWidget } from "../components/BookingWidget";
import { JsonLd } from "../components/JsonLd";
import { SiteChrome } from "../components/SiteChrome";
import { fetchRoutes } from "../lib/api";
import { t, type Locale } from "../lib/i18n";
import {
  buildPageMetadata,
  faqJsonLd,
  localeFromSearchParams,
  organizationJsonLd,
  serviceJsonLd,
} from "../lib/seo";
import { whatsappDisplay, whatsappE164, whatsappHref } from "../lib/whatsapp";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "home", locale, pathname: "/" });
}

const fleetRows = [
  {
    src: "/vehicles/haram-pack-suv.jpg",
    labelKey: "fleetHaramPack" as const,
    capKey: "fleetCapHaramPack" as const,
    altEn: "Haram Pak SUV at an airport arrival curb with luggage trolley",
    altAr: "سيارة حرم باك عند رصيف المطار مع عربة أمتعة",
  },
  {
    src: "/vehicles/gmc-class-suv.jpg",
    labelKey: "fleetGmc" as const,
    capKey: "fleetCapGmc" as const,
    altEn: "GMC-class SUV on a desert highway corridor",
    altAr: "سيارة فئة جي إم سي على طريق صحراوي",
  },
  {
    src: "/vehicles/lexus-class-suv.jpg",
    labelKey: "fleetLexus" as const,
    capKey: "fleetCapLexus" as const,
    altEn: "Lexus-class SUV at a hotel porte-cochere",
    altAr: "سيارة فئة لكزس أمام مدخل فندق",
  },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const wa = whatsappE164();
  const routes = await fetchRoutes();
  const waHref = wa ? whatsappHref(wa, t(locale, "whatsappPrefill")) : null;

  return (
    <SiteChrome locale={locale}>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={serviceJsonLd()} />
      <JsonLd data={faqJsonLd(locale)} />

      {/* 1. Hero — one job: say what + where */}
      <section
        aria-labelledby="hero-heading"
        className="hr-bleed"
        style={{
          position: "relative",
          minHeight: "min(62vh, 560px)",
          display: "grid",
          alignItems: "end",
          overflow: "hidden",
          background: "#0B1F3A",
        }}
      >
        <Image
          src="/vehicles/haram-pack-suv.jpg"
          alt={locale === "ar" ? fleetRows[0].altAr : fleetRows[0].altEn}
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 40%" }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,31,58,0.3) 0%, rgba(11,31,58,0.55) 45%, rgba(11,31,58,0.92) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "40px clamp(16px, 4vw, 48px) 36px",
            display: "grid",
            gap: 12,
            maxWidth: 640,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "clamp(2.2rem, 5.5vw, 3.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#fff",
            }}
          >
            {t(locale, "heroTitle")}
          </p>
          <h1
            id="hero-heading"
            style={{
              margin: 0,
              fontSize: "clamp(1.2rem, 2.6vw, 1.6rem)",
              fontWeight: 600,
              color: "rgba(255,255,255,0.94)",
              lineHeight: 1.35,
            }}
          >
            {t(locale, "heroHeadline")}
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 1.5, maxWidth: 480 }}>
            {t(locale, "heroBody")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 6 }}>
            <a
              href="#book"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 46,
                padding: "0 18px",
                borderRadius: 12,
                background: "#F0771F",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              {t(locale, "searchCta")}
            </a>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#E8FFF0",
                  fontWeight: 600,
                  fontSize: 15,
                  textUnderlineOffset: 4,
                }}
              >
                {t(locale, "whatsappCta")}
              </a>
            ) : (
              <Link
                href={`/how-it-works?lang=${locale}`}
                style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, fontSize: 15 }}
              >
                {t(locale, "howItWorks")}
              </Link>
            )}
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: 13 }}>{t(locale, "pilot")}</p>
        </div>
      </section>

      {/* 2. Book — the main next step */}
      <section
        id="book"
        aria-labelledby="book-heading"
        style={{ marginTop: 40, display: "grid", gap: 12, maxWidth: 520 }}
      >
        <h2 id="book-heading" style={{ margin: 0, fontSize: 26 }}>
          {t(locale, "bookHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", fontSize: 15 }}>{t(locale, "bookHint")}</p>
        <BookingWidget locale={locale} routes={routes} />
      </section>

      {/* 3. Fleet — once */}
      <section id="fleet" aria-labelledby="fleet-heading" style={{ marginTop: 56, display: "grid", gap: 14 }}>
        <h2 id="fleet-heading" style={{ margin: 0, fontSize: 26 }}>
          {t(locale, "fleetShowcaseHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", maxWidth: 560 }}>{t(locale, "fleetHint")}</p>
        <div
          className="hr-fleet-row"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}
        >
          {fleetRows.map((row, i) => {
            const accent = (["#1A5FBF", "#F0771F", "#D62828"] as const)[i] ?? "#1A5FBF";
            return (
              <figure key={row.src} style={{ margin: 0, display: "grid", gap: 8 }}>
                <div
                  style={{
                    overflow: "hidden",
                    background: "#E8EDF5",
                    aspectRatio: "16 / 10",
                    borderBottom: `3px solid ${accent}`,
                  }}
                >
                  <Image
                    src={row.src}
                    alt={locale === "ar" ? row.altAr : row.altEn}
                    width={640}
                    height={400}
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <figcaption style={{ display: "grid", gap: 2 }}>
                  <strong style={{ color: "#0B1F3A", fontSize: 16 }}>{t(locale, row.labelKey)}</strong>
                  <span style={{ color: "#526276", fontSize: 14 }}>{t(locale, row.capKey)}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* 4. Help — one place */}
      <section
        aria-labelledby="help-heading"
        style={{
          marginTop: 56,
          paddingTop: 28,
          borderTop: "1px solid rgba(11,31,58,0.1)",
          display: "grid",
          gap: 10,
          maxWidth: 520,
        }}
      >
        <h2 id="help-heading" style={{ margin: 0, fontSize: 26 }}>
          {t(locale, "contactHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "homeContactBody")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 16 }}>
              WhatsApp · {whatsappDisplay(wa!)}
            </a>
          ) : null}
          <Link href={`/about?lang=${locale}`} style={{ fontWeight: 600 }}>
            {t(locale, "aboutNav")}
          </Link>
          <Link href={`/how-it-works?lang=${locale}`} style={{ fontWeight: 600 }}>
            {t(locale, "howItWorks")}
          </Link>
          <Link href={`/faq?lang=${locale}`} style={{ fontWeight: 600 }}>
            {t(locale, "faqNav")}
          </Link>
        </div>
      </section>

      <style>{`
        .hr-bleed {
          width: calc(100% + 2 * clamp(16px, 4vw, 48px));
          margin-inline: calc(-1 * clamp(16px, 4vw, 48px));
          margin-top: -28px;
        }
        @media (max-width: 800px) {
          .hr-fleet-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SiteChrome>
  );
}
