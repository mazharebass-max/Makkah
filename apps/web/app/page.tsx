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
    altEn: "Haram Pack SUV at an airport arrival curb with luggage trolley",
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

  const highlights = [
    t(locale, "highlight1"),
    t(locale, "highlight2"),
    t(locale, "highlight3"),
    t(locale, "highlight4"),
  ];
  const easySteps = [
    { title: t(locale, "easyStep1Title"), body: t(locale, "easyStep1Body") },
    { title: t(locale, "easyStep2Title"), body: t(locale, "easyStep2Body") },
    { title: t(locale, "easyStep3Title"), body: t(locale, "easyStep3Body") },
  ];

  return (
    <SiteChrome locale={locale}>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={serviceJsonLd()} />
      <JsonLd data={faqJsonLd(locale)} />

      {/* Full-bleed corridor hero — service-site feel, not a dashboard */}
      <section
        aria-labelledby="hero-heading"
        className="hr-bleed"
        style={{
          position: "relative",
          minHeight: "min(78vh, 720px)",
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
              "linear-gradient(180deg, rgba(11,31,58,0.35) 0%, rgba(11,31,58,0.55) 42%, rgba(11,31,58,0.88) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "48px clamp(16px, 4vw, 48px) 40px",
            display: "grid",
            gap: 16,
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", marginTop: 4 }}>
            <Link
              href={`/?lang=${locale}#book`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 46,
                padding: "11px 20px",
                borderRadius: 14,
                background: "#F0771F",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 10px 28px rgba(240,119,31,0.35)",
              }}
            >
              {t(locale, "searchCta")}
            </Link>
            {wa ? (
              <a
                href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 42,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(37,211,102,0.65)",
                  background: "rgba(240,255,246,0.12)",
                  color: "#E8FFF0",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="#25D366"
                    d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.85 14.12c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.89 1.05.93 1.94 1.22 2.21 1.36.28.14.44.12.6-.07.16-.19.7-.81.89-1.09.19-.28.37-.23.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.7-.17 1.38z"
                  />
                </svg>
                {t(locale, "whatsappCta")}
                <span style={{ opacity: 0.85, fontWeight: 500 }}>{whatsappDisplay(wa)}</span>
              </a>
            ) : null}
            <Link
              href={`/how-it-works?lang=${locale}`}
              style={{
                color: "rgba(255,255,255,0.9)",
                fontWeight: 600,
                fontSize: 15,
                textUnderlineOffset: 4,
              }}
            >
              {t(locale, "howItWorks")}
            </Link>
          </div>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.62)", fontSize: 13 }}>
            {t(locale, "pilot")}
          </p>
        </div>
      </section>

      {/* Services strip — calm bullets, not icon cards */}
      <section
        aria-labelledby="services-heading"
        style={{ marginTop: 56, display: "grid", gap: 14, maxWidth: 720 }}
      >
        <h2 id="services-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "servicesHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "servicesHint")}</p>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.75 }}>
          {highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      {/* Easy booking steps */}
      <section
        id="easy-book"
        aria-labelledby="easy-heading"
        style={{ marginTop: 56, display: "grid", gap: 18, maxWidth: 720 }}
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
            counterReset: "easy",
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

      {/* Book form — product interaction below the story */}
      <section
        id="book"
        aria-labelledby="book-heading"
        style={{
          marginTop: 56,
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

      {/* Haram Pack + Madinah / Makkah place stills */}
      <section
        id="places"
        aria-labelledby="places-heading"
        style={{ marginTop: 64, display: "grid", gap: 16 }}
      >
        <h2 id="places-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "placesHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", maxWidth: 680 }}>{t(locale, "placesHint")}</p>
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

      {/* Cars available — photo row, human catalog feel */}
      <section
        id="fleet"
        aria-labelledby="fleet-heading"
        style={{ marginTop: 64, display: "grid", gap: 18 }}
      >
        <h2 id="fleet-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "carsAvailableHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", maxWidth: 680 }}>{t(locale, "fleetHint")}</p>
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

      {/* Meeting points — light, not ops-console dense */}
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

      {/* Passenger note */}
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

      {/* Soft contact close */}
      <section
        aria-labelledby="home-contact-heading"
        style={{
          marginTop: 64,
          padding: "28px 0 8px",
          borderTop: "1px solid rgba(11,31,58,0.1)",
          display: "grid",
          gap: 12,
          maxWidth: 640,
        }}
      >
        <h2 id="home-contact-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "contactHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "homeContactBody")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          {wa ? (
            <a
              href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 700, fontSize: 16 }}
            >
              WhatsApp · {whatsappDisplay(wa)}
            </a>
          ) : null}
          <Link href={`/contact?lang=${locale}`} style={{ fontWeight: 600 }}>
            {t(locale, "contactNav")}
          </Link>
          <Link href={`/login?lang=${locale}&mode=signup`} style={{ fontWeight: 600 }}>
            {t(locale, "signUp")}
          </Link>
        </div>
      </section>

      <style>{`
        .hr-bleed {
          width: calc(100% + 2 * clamp(16px, 4vw, 48px));
          margin-inline: calc(-1 * clamp(16px, 4vw, 48px));
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
        @media (max-width: 800px) {
          .hr-fleet-row { grid-template-columns: 1fr !important; }
          .hr-places-row { grid-template-columns: 1fr !important; }
          .hr-trip-row { grid-template-columns: 88px minmax(0, 1fr) !important; }
          .hr-trip-row > div:last-child { grid-column: 2; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hr-bleed, .hr-fleet-row figure { animation: none !important; }
        }
      `}</style>
    </SiteChrome>
  );
}
