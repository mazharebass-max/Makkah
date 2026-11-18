import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { BookingWidget } from "../components/BookingWidget";
import { JsonLd } from "../components/JsonLd";
import { SiteChrome } from "../components/SiteChrome";
import { fetchPickupPoints, fetchRoutes } from "../lib/api";
import { corridorVisual, placeHighlights } from "../lib/public-content";
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
  const [routes, pickupPoints] = await Promise.all([fetchRoutes(), fetchPickupPoints()]);

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

  const trustPoints = [
    { title: t(locale, "trustPriceTitle"), body: t(locale, "trustPriceBody"), accent: "#F0771F" },
    { title: t(locale, "trustFleetTitle"), body: t(locale, "trustFleetBody"), accent: "#1A5FBF" },
    { title: t(locale, "trustDriverTitle"), body: t(locale, "trustDriverBody"), accent: "#0B1F3A" },
    { title: t(locale, "trustSecureTitle"), body: t(locale, "trustSecureBody"), accent: "#D62828" },
    { title: t(locale, "trustFastTitle"), body: t(locale, "trustFastBody"), accent: "#25D366" },
  ];

  const easySteps = [
    { title: t(locale, "easyStep1Title"), body: t(locale, "easyStep1Body") },
    { title: t(locale, "easyStep2Title"), body: t(locale, "easyStep2Body") },
    { title: t(locale, "easyStep3Title"), body: t(locale, "easyStep3Body") },
  ];

  const waHref = wa ? whatsappHref(wa, t(locale, "whatsappPrefill")) : null;

  return (
    <SiteChrome locale={locale}>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={serviceJsonLd()} />
      <JsonLd data={faqJsonLd(locale)} />

      {/* Full-bleed hero — service-site energy, our brand */}
      <section
        aria-labelledby="hero-heading"
        className="hr-bleed"
        style={{
          position: "relative",
          minHeight: "min(72vh, 680px)",
          display: "grid",
          alignItems: "end",
          overflow: "hidden",
          background: "#0B1F3A",
          animation: "hr-fade 520ms ease both",
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
              "linear-gradient(180deg, rgba(11,31,58,0.28) 0%, rgba(11,31,58,0.5) 40%, rgba(11,31,58,0.9) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "48px clamp(16px, 4vw, 48px) 36px",
            display: "grid",
            gap: 14,
            maxWidth: 720,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 1.02,
              color: "#fff",
            }}
          >
            {t(locale, "heroTitle")}
          </p>
          <h1
            id="hero-heading"
            style={{
              margin: 0,
              fontSize: "clamp(1.25rem, 2.8vw, 1.75rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              color: "rgba(255,255,255,0.94)",
            }}
          >
            {t(locale, "heroHeadline")}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.55,
              maxWidth: 520,
            }}
          >
            {t(locale, "heroBody")}
          </p>
          <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.62)", fontSize: 13 }}>
            {t(locale, "pilot")}
          </p>
        </div>
      </section>

      {/* Quick action strip — inspired by service sites, our palette (not yellow clone) */}
      <section
        aria-label={t(locale, "searchCta")}
        className="hr-bleed hr-quick-bar"
        style={{
          display: "grid",
          gridTemplateColumns: waHref ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
          padding: "12px clamp(16px, 4vw, 48px)",
          background: "#0B1F3A",
        }}
      >
        <Link
          href={`/?lang=${locale}#book`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 52,
            borderRadius: 12,
            background: "#F0771F",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          {t(locale, "quickBook")}
        </Link>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 52,
              borderRadius: 12,
              background: "#25D366",
              color: "#063B2D",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            {t(locale, "quickWhatsApp")}
          </a>
        ) : null}
        <Link
          href={`/?lang=${locale}#fleet`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 52,
            borderRadius: 12,
            background: "#1A5FBF",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          {t(locale, "quickFleet")}
        </Link>
      </section>

      {/* Why choose — trust strip */}
      <section
        aria-labelledby="why-heading"
        style={{ marginTop: 48, display: "grid", gap: 18 }}
      >
        <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
          <h2 id="why-heading" style={{ margin: 0, fontSize: 28 }}>
            {t(locale, "whyChooseHeading")}
          </h2>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "whyChooseHint")}</p>
        </div>
        <div
          className="hr-trust-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {trustPoints.map((item) => (
            <div
              key={item.title}
              style={{
                display: "grid",
                gap: 8,
                padding: "16px 14px",
                borderTop: `3px solid ${item.accent}`,
                background: "rgba(255,255,255,0.72)",
              }}
            >
              <strong style={{ color: "#0B1F3A", fontSize: 15, lineHeight: 1.3 }}>{item.title}</strong>
              <span style={{ color: "#526276", fontSize: 13, lineHeight: 1.45 }}>{item.body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet showcase — early like the reference */}
      <section
        id="fleet"
        aria-labelledby="fleet-heading"
        style={{ marginTop: 64, display: "grid", gap: 18 }}
      >
        <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
          <h2 id="fleet-heading" style={{ margin: 0, fontSize: 28 }}>
            {t(locale, "fleetShowcaseHeading")}
          </h2>
          <p style={{ margin: 0, color: "#526276" }}>{t(locale, "fleetHint")}</p>
        </div>
        <div
          className="hr-fleet-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          {fleetRows.map((row, i) => {
            const accent = (["#1A5FBF", "#F0771F", "#D62828"] as const)[i] ?? "#1A5FBF";
            return (
              <figure
                key={row.src}
                style={{
                  margin: 0,
                  display: "grid",
                  gap: 10,
                  animation: `hr-rise 620ms ease ${80 + i * 70}ms both`,
                }}
              >
                <div
                  style={{
                    overflow: "hidden",
                    background: "#E8EDF5",
                    aspectRatio: "16 / 10",
                    borderBottom: `4px solid ${accent}`,
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
                <figcaption style={{ display: "grid", gap: 4 }}>
                  <strong style={{ color: "#0B1F3A", fontSize: 17 }}>{t(locale, row.labelKey)}</strong>
                  <span style={{ color: "#526276", fontSize: 14 }}>{t(locale, row.capKey)}</span>
                  <span style={{ color: accent, fontSize: 12, fontWeight: 700 }}>
                    {t(locale, "fleetFareDraft")}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <Link href={`/fleet?lang=${locale}`} style={{ fontWeight: 600, width: "fit-content" }}>
          {t(locale, "fleetNav")}
        </Link>
      </section>

      {/* Destinations — city-tour energy without cloning */}
      <section
        id="places"
        aria-labelledby="destinations-heading"
        style={{ marginTop: 64, display: "grid", gap: 16 }}
      >
        <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
          <h2 id="destinations-heading" style={{ margin: 0, fontSize: 28 }}>
            {t(locale, "destinationsHeading")}
          </h2>
          <p style={{ margin: 0, color: "#526276" }}>{t(locale, "destinationsHint")}</p>
        </div>
        <div
          className="hr-places-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {placeHighlights.map((p, i) => (
            <figure
              key={p.src}
              style={{
                margin: 0,
                display: "grid",
                gap: 8,
                animation: `hr-rise 600ms ease ${60 + i * 60}ms both`,
              }}
            >
              <div style={{ overflow: "hidden", background: "#E8EDF5", aspectRatio: "4 / 3" }}>
                <Image
                  src={p.src}
                  alt={locale === "ar" ? p.altAr : p.altEn}
                  width={800}
                  height={600}
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <figcaption style={{ display: "grid", gap: 4 }}>
                <strong style={{ color: "#0B1F3A", fontSize: 17 }}>{t(locale, p.titleKey)}</strong>
                <span style={{ color: "#526276", fontSize: 14, lineHeight: 1.5 }}>{t(locale, p.bodyKey)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Trips offered */}
      <section
        id="trips-offered"
        aria-labelledby="trips-heading"
        style={{ marginTop: 64, display: "grid", gap: 16 }}
      >
        <h2 id="trips-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "tripsOfferedHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", maxWidth: 680 }}>{t(locale, "tripsOfferedHint")}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0, maxWidth: 820 }}>
          {routes.map((r) => {
            const visual = corridorVisual(r.code);
            return (
              <li
                key={r.code}
                style={{
                  padding: "18px 0",
                  display: "grid",
                  gridTemplateColumns: "120px minmax(0, 1fr) auto",
                  gap: 16,
                  alignItems: "center",
                  borderBottom: "1px solid rgba(11,31,58,0.1)",
                }}
                className="hr-trip-row"
              >
                <div style={{ overflow: "hidden", background: "#E8EDF5", width: 120, height: 80 }}>
                  <Image
                    src={visual.src}
                    alt={locale === "ar" ? visual.altAr : visual.altEn}
                    width={240}
                    height={160}
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={{ fontSize: 18, color: "#0B1F3A" }}>
                    {locale === "ar" && r.nameAr ? r.nameAr : r.nameEn}
                  </strong>
                  <span style={{ color: "#526276", fontSize: 13 }}>{r.code}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge tone="warning">{r.draftLabel}</Badge>
                  <Link href={`/?lang=${locale}#book`} style={{ fontWeight: 600, fontSize: 14 }}>
                    {t(locale, "searchCta")}
                  </Link>
                </div>
              </li>
            );
          })}
          {routes.length === 0 ? (
            <li style={{ color: "#526276" }}>{t(locale, "emptySearch")}</li>
          ) : null}
        </ul>
        <Link href={`/routes?lang=${locale}`} style={{ fontWeight: 600, width: "fit-content" }}>
          {t(locale, "tripsOfferedMore")}
        </Link>
      </section>

      {/* Easy booking + book form */}
      <section
        id="easy-book"
        aria-labelledby="easy-heading"
        style={{ marginTop: 64, display: "grid", gap: 18, maxWidth: 720 }}
      >
        <h2 id="easy-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "easyBookHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "easyBookHint")}</p>
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 20,
          }}
        >
          {easySteps.map((s, i) => {
            const accent = (["#1A5FBF", "#F0771F", "#D62828"] as const)[i] ?? "#1A5FBF";
            return (
              <li
                key={s.title}
                style={{
                  display: "grid",
                  gap: 6,
                  paddingBottom: 16,
                  paddingInlineStart: 14,
                  borderBottom: "1px solid rgba(11,31,58,0.08)",
                  borderInlineStart: `4px solid ${accent}`,
                }}
              >
                <strong style={{ color: "#0B1F3A", fontSize: 18 }}>{s.title}</strong>
                <span style={{ color: "#526276", lineHeight: 1.55 }}>{s.body}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section
        id="book"
        aria-labelledby="book-heading"
        style={{
          marginTop: 48,
          display: "grid",
          gap: 14,
          maxWidth: 520,
          animation: "hr-rise 640ms ease 40ms both",
        }}
      >
        <h2 id="book-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "bookHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", fontSize: 15 }}>{t(locale, "bookHint")}</p>
        <BookingWidget locale={locale} routes={routes} />
      </section>

      {/* Meeting points */}
      <section
        id="pickup-points"
        aria-labelledby="pickup-heading"
        style={{ marginTop: 64, display: "grid", gap: 14, maxWidth: 720 }}
      >
        <h2 id="pickup-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "pickupPoints")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "pickupHint")}</p>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.7 }}>
          {pickupPoints.slice(0, 6).map((p) => (
            <li key={p.code}>
              <strong style={{ color: "#0B1F3A" }}>
                {locale === "ar" && p.nameAr ? p.nameAr : p.nameEn}
              </strong>
              <span>
                {" "}
                · {p.zone.code} · {p.draftLabel}
              </span>
            </li>
          ))}
          {pickupPoints.length === 0 ? <li>{t(locale, "emptySearch")}</li> : null}
        </ul>
      </section>

      <section
        aria-labelledby="quote-heading"
        style={{ marginTop: 64, display: "grid", gap: 12, maxWidth: 640 }}
      >
        <h2 id="quote-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "reviewsHeading")}
        </h2>
        <blockquote
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            fontSize: 20,
            lineHeight: 1.45,
            color: "#0B1F3A",
            letterSpacing: "-0.02em",
            fontWeight: 600,
          }}
        >
          “{t(locale, "quoteBody")}”
        </blockquote>
        <p style={{ margin: 0, color: "#526276", fontSize: 14 }}>{t(locale, "quoteAttr")}</p>
        <p style={{ margin: 0, color: "#D62828", fontSize: 13 }}>{t(locale, "quoteCaveat")}</p>
      </section>

      <section
        aria-labelledby="faq-heading"
        style={{ marginTop: 64, display: "grid", gap: 16, maxWidth: 720 }}
      >
        <h2 id="faq-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "faqHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "faqHomeHint")}</p>
        <dl style={{ margin: 0, display: "grid", gap: 18 }}>
          {faqs.map((f) => (
            <div key={f.q} style={{ paddingBottom: 14, borderBottom: "1px solid rgba(11,31,58,0.08)" }}>
              <dt style={{ fontWeight: 700 }}>{f.q}</dt>
              <dd style={{ margin: "8px 0 0", color: "#526276", lineHeight: 1.6 }}>{f.a}</dd>
            </div>
          ))}
        </dl>
        <Link href={`/faq?lang=${locale}`} style={{ fontWeight: 600, width: "fit-content" }}>
          {t(locale, "faqNav")}
        </Link>
      </section>

      {/* Strong contact close */}
      <section
        aria-labelledby="home-contact-heading"
        className="hr-contact-band"
        style={{
          marginTop: 64,
          padding: "32px clamp(16px, 3vw, 28px)",
          borderRadius: 18,
          background: "linear-gradient(135deg, #0B1F3A 0%, #1A5FBF 100%)",
          color: "#fff",
          display: "grid",
          gap: 14,
        }}
      >
        <h2 id="home-contact-heading" style={{ margin: 0, fontSize: 28, color: "#fff" }}>
          {t(locale, "contactHeading")}
        </h2>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", lineHeight: 1.55, maxWidth: 560 }}>
          {t(locale, "homeContactBody")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 46,
                padding: "0 16px",
                borderRadius: 12,
                background: "#25D366",
                color: "#063B2D",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              WhatsApp · {whatsappDisplay(wa!)}
            </a>
          ) : null}
          <Link
            href={`/contact?lang=${locale}`}
            style={{ color: "#fff", fontWeight: 700, textUnderlineOffset: 4 }}
          >
            {t(locale, "contactNav")}
          </Link>
          <Link
            href={`/login?lang=${locale}&mode=signup`}
            style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, textUnderlineOffset: 4 }}
          >
            {t(locale, "signUp")}
          </Link>
        </div>
      </section>

      <style>{`
        .hr-bleed {
          width: calc(100% + 2 * clamp(16px, 4vw, 48px));
          margin-inline: calc(-1 * clamp(16px, 4vw, 48px));
        }
        .hr-bleed.hr-quick-bar {
          margin-top: 0;
        }
        section.hr-bleed:first-of-type {
          margin-top: -28px;
        }
        @keyframes hr-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes hr-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 960px) {
          .hr-trust-row { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 800px) {
          .hr-fleet-row { grid-template-columns: 1fr !important; }
          .hr-places-row { grid-template-columns: 1fr !important; }
          .hr-trip-row { grid-template-columns: 88px minmax(0, 1fr) !important; }
          .hr-trip-row > div:last-child { grid-column: 2; }
          .hr-quick-bar { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .hr-trust-row { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hr-bleed, .hr-fleet-row figure { animation: none !important; }
        }
      `}</style>
    </SiteChrome>
  );
}
