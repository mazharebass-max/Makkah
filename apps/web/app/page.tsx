import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { BookingWidget } from "../components/BookingWidget";
import { JsonLd } from "../components/JsonLd";
import { SiteChrome } from "../components/SiteChrome";
import { fetchPickupPoints, fetchRoutes } from "../lib/api";
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
  ];
  const included = [
    t(locale, "included1"),
    t(locale, "included2"),
    t(locale, "included3"),
    t(locale, "included4"),
    t(locale, "included5"),
  ];
  const transferSteps = [
    { title: t(locale, "transferStep1Title"), body: t(locale, "transferStep1Body") },
    { title: t(locale, "transferStep2Title"), body: t(locale, "transferStep2Body") },
    { title: t(locale, "transferStep3Title"), body: t(locale, "transferStep3Body") },
    { title: t(locale, "transferStep4Title"), body: t(locale, "transferStep4Body") },
  ];
  const corridorOps = [
    {
      codes: ["JED-MAKKAH", "JEDDAH-MAKKAH"],
      titleEn: "JED Airport ↔ Makkah hotels",
      titleAr: "مطار جدة ↔ فنادق مكة",
      pickup: t(locale, "corridorJedMakkahPickup"),
      dropoff: t(locale, "corridorJedMakkahDropoff"),
      duration: t(locale, "corridorJedMakkahDuration"),
      note: t(locale, "corridorJedMakkahNote"),
    },
    {
      codes: ["MAKKAH-MADINAH"],
      titleEn: "Makkah ↔ Madinah",
      titleAr: "مكة ↔ المدينة",
      pickup: t(locale, "corridorMakkahMadinahPickup"),
      dropoff: t(locale, "corridorMakkahMadinahDropoff"),
      duration: t(locale, "corridorMakkahMadinahDuration"),
      note: t(locale, "corridorMakkahMadinahNote"),
    },
    {
      codes: ["MED-MADINAH"],
      titleEn: "MED Airport ↔ Madinah hotels",
      titleAr: "مطار المدينة ↔ فنادق المدينة",
      pickup: t(locale, "corridorMedMadinahPickup"),
      dropoff: t(locale, "corridorMedMadinahDropoff"),
      duration: t(locale, "corridorMedMadinahDuration"),
      note: t(locale, "corridorMedMadinahNote"),
    },
  ];
  const notes = [
    { title: t(locale, "note1Title"), body: t(locale, "note1Body") },
    { title: t(locale, "note2Title"), body: t(locale, "note2Body") },
    { title: t(locale, "note3Title"), body: t(locale, "note3Body") },
  ];

  return (
    <SiteChrome locale={locale}>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={serviceJsonLd()} />
      <JsonLd data={faqJsonLd(locale)} />

      {/* Corridor hero — Taxi Arabia–style service page, Haramain tokens */}
      <section
        aria-labelledby="hero-heading"
        className="hr-hero-grid"
        style={{
          display: "grid",
          gap: 28,
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(280px, 0.95fr)",
          alignItems: "start",
          background: "#F6F3EC",
          marginInline: -8,
          padding: "8px 8px 8px",
          animation: "hr-fade 480ms ease both",
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(2.2rem, 5.5vw, 3.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#0B1F3A",
            }}
          >
            {t(locale, "heroTitle")}
          </p>
          <h1
            id="hero-heading"
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 3vw, 1.85rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              color: "#0B1F3A",
            }}
          >
            {t(locale, "heroHeadline")}
          </h1>
          <p style={{ margin: 0, fontSize: 17, color: "#526276", maxWidth: 540, lineHeight: 1.55 }}>
            {t(locale, "heroBody")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <Link
              href={`/?lang=${locale}#book`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                padding: "10px 18px",
                borderRadius: 16,
                background: "#174A8B",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 8px 24px rgba(23, 74, 139, 0.22)",
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
                  color: "#087F6D",
                  fontWeight: 600,
                  fontSize: 15,
                  textUnderlineOffset: 4,
                }}
              >
                {t(locale, "whatsappCta")} · {whatsappDisplay(wa)}
              </a>
            ) : (
              <Link
                href={`/?lang=${locale}#how-it-works`}
                style={{
                  color: "#174A8B",
                  fontWeight: 600,
                  fontSize: 15,
                  textUnderlineOffset: 4,
                }}
              >
                {t(locale, "howItWorks")}
              </Link>
            )}
          </div>

          <figure
            style={{
              margin: "8px 0 0",
              overflow: "hidden",
              background: "#E8E2D6",
              animation: "hr-rise 640ms ease 60ms both",
            }}
          >
            <Image
              src="/vehicles/haram-pack-suv.jpg"
              alt={locale === "ar" ? fleetRows[0].altAr : fleetRows[0].altEn}
              width={1280}
              height={720}
              priority
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                objectFit: "cover",
                maxHeight: 360,
              }}
            />
            <figcaption style={{ padding: "10px 2px 0", color: "#526276", fontSize: 13 }}>
              {t(locale, "fleetHaramPack")} — {t(locale, "fleetCapHaramPack")}
            </figcaption>
          </figure>
        </div>

        <div id="book" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{t(locale, "bookHeading")}</h2>
          <p style={{ margin: 0, color: "#526276", fontSize: 14 }}>{t(locale, "bookHint")}</p>
          <BookingWidget locale={locale} routes={routes} />
        </div>
      </section>

      <section
        id="highlights"
        aria-labelledby="highlights-heading"
        style={{ marginTop: 56, display: "grid", gap: 14, maxWidth: 720 }}
      >
        <h2 id="highlights-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "highlightsHeading")}
        </h2>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.7 }}>
          {highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <section
        id="fleet"
        aria-labelledby="fleet-heading"
        style={{ marginTop: 56, display: "grid", gap: 16 }}
      >
        <h2 id="fleet-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "fleetHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", maxWidth: 680 }}>{t(locale, "fleetHint")}</p>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 560,
              background: "#fff",
            }}
          >
            <thead>
              <tr style={{ textAlign: "start", borderBottom: "2px solid rgba(11,31,58,0.12)" }}>
                <th style={{ padding: "12px 10px", fontWeight: 700 }}>{t(locale, "fleetTableVehicle")}</th>
                <th style={{ padding: "12px 10px", fontWeight: 700 }}>{t(locale, "fleetTableCapacity")}</th>
                <th style={{ padding: "12px 10px", fontWeight: 700 }}>{t(locale, "fleetTableFare")}</th>
              </tr>
            </thead>
            <tbody>
              {fleetRows.map((row) => (
                <tr key={row.src} style={{ borderBottom: "1px solid rgba(11,31,58,0.08)" }}>
                  <td style={{ padding: "14px 10px" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Image
                        src={row.src}
                        alt={locale === "ar" ? row.altAr : row.altEn}
                        width={120}
                        height={68}
                        style={{
                          width: 120,
                          height: 68,
                          objectFit: "cover",
                          background: "#E8E2D6",
                          flexShrink: 0,
                        }}
                      />
                      <strong style={{ color: "#0B1F3A" }}>{t(locale, row.labelKey)}</strong>
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", color: "#526276" }}>{t(locale, row.capKey)}</td>
                  <td style={{ padding: "14px 10px" }}>
                    <Badge tone="warning">{t(locale, "fleetFareDraft")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        style={{ marginTop: 56, display: "grid", gap: 16, maxWidth: 720 }}
      >
        <h2 id="how-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "howItWorksHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "howItWorksHint")}</p>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 16 }}>
          {transferSteps.map((s) => (
            <li key={s.title} style={{ display: "grid", gap: 4 }}>
              <strong style={{ color: "#0B1F3A" }}>{s.title}</strong>
              <span style={{ color: "#526276", lineHeight: 1.55 }}>{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="included-heading"
        style={{ marginTop: 56, display: "grid", gap: 12, maxWidth: 680 }}
      >
        <h2 id="included-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "includedHeading")}
        </h2>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.7 }}>
          {included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section
        id="corridor-ops"
        aria-labelledby="corridor-ops-heading"
        style={{ marginTop: 56, display: "grid", gap: 16 }}
      >
        <h2 id="corridor-ops-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "corridorOpsHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", maxWidth: 720 }}>{t(locale, "corridorOpsHint")}</p>
        <Badge tone="warning">{t(locale, "draft")}</Badge>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 20 }}>
          {corridorOps.map((c) => {
            const live = routes.find((r) => c.codes.includes(r.code));
            const title =
              locale === "ar"
                ? live?.nameAr || c.titleAr
                : live?.nameEn || c.titleEn;
            return (
              <li
                key={c.codes.join("-")}
                style={{
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(11,31,58,0.08)",
                  display: "grid",
                  gap: 8,
                  maxWidth: 720,
                }}
              >
                <strong style={{ color: "#0B1F3A", fontSize: 18 }}>{title}</strong>
                <div style={{ color: "#526276", fontSize: 14, lineHeight: 1.6 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0B1F3A" }}>{t(locale, "corridorOpsPickup")}: </span>
                    {c.pickup}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0B1F3A" }}>{t(locale, "corridorOpsDropoff")}: </span>
                    {c.dropoff}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0B1F3A" }}>{t(locale, "corridorOpsDuration")}: </span>
                    {c.duration}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0B1F3A" }}>{t(locale, "corridorOpsNote")}: </span>
                    {c.note}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="quote-heading"
        style={{ marginTop: 56, display: "grid", gap: 12, maxWidth: 640 }}
      >
        <h2 id="quote-heading" style={{ margin: 0, fontSize: 28 }}>
          {locale === "ar" ? "ملاحظات الركاب (عينة تجريبية)" : "Passenger feedback (pilot sample)"}
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
        <p style={{ margin: 0, color: "#087F6D", fontSize: 13 }}>{t(locale, "quoteCaveat")}</p>
      </section>

      <section id="notes" aria-labelledby="notes-heading" style={{ marginTop: 56, display: "grid", gap: 16 }}>
        <h2 id="notes-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "notesHeading")}
        </h2>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 18, maxWidth: 640 }}>
          {notes.map((n, i) => (
            <li key={n.title} style={{ display: "grid", gap: 4 }}>
              <strong style={{ color: "#0B1F3A" }}>
                {i + 1}. {n.title}
              </strong>
              <span style={{ color: "#526276", lineHeight: 1.55 }}>{n.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="routes" aria-labelledby="routes-heading" style={{ marginTop: 56, display: "grid", gap: 16 }}>
        <h2 id="routes-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "routes")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "routesHint")}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0 }}>
          {routes.map((r) => (
            <li
              key={r.code}
              style={{
                padding: "16px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                borderBottom: "1px solid rgba(11,31,58,0.08)",
              }}
            >
              <div>
                <strong>{locale === "ar" && r.nameAr ? r.nameAr : r.nameEn}</strong>
                <div style={{ color: "#526276", fontSize: 13 }}>{r.code}</div>
              </div>
              <Badge tone="warning">{r.draftLabel}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="pickup-points"
        aria-labelledby="pickup-heading"
        style={{ marginTop: 56, display: "grid", gap: 16 }}
      >
        <h2 id="pickup-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "pickupPoints")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "pickupHint")}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0 }}>
          {pickupPoints.map((p) => (
            <li
              key={p.code}
              style={{
                padding: "16px 0",
                borderBottom: "1px solid rgba(11,31,58,0.08)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{locale === "ar" && p.nameAr ? p.nameAr : p.nameEn}</strong>
                <div style={{ color: "#526276", fontSize: 13 }}>
                  {p.code} · {p.zone.code} · {p.kind}
                </div>
              </div>
              <Badge tone="warning">{p.draftLabel}</Badge>
            </li>
          ))}
          {pickupPoints.length === 0 ? (
            <li style={{ color: "#526276" }}>{t(locale, "emptySearch")}</li>
          ) : null}
        </ul>
      </section>

      <section aria-labelledby="faq-heading" style={{ marginTop: 56, display: "grid", gap: 16, maxWidth: 720 }}>
        <h2 id="faq-heading" style={{ margin: 0 }}>
          {t(locale, "faqHeading")}
        </h2>
        <dl style={{ margin: 0, display: "grid", gap: 16 }}>
          {faqs.map((f) => (
            <div key={f.q}>
              <dt style={{ fontWeight: 700 }}>{f.q}</dt>
              <dd style={{ margin: "6px 0 0", color: "#526276", lineHeight: 1.6 }}>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <style>{`
        @keyframes hr-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes hr-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 900px) {
          .hr-hero-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </SiteChrome>
  );
}
