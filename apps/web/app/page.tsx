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

const fleetShots = [
  {
    src: "/vehicles/haram-pack-suv.jpg",
    labelKey: "fleetHaramPack" as const,
    altEn: "Haram Pack class premium black SUV (placeholder fleet photo)",
    altAr: "سيارة حرم باك سوداء فاخرة (صورة مؤقتة للأسطول)",
  },
  {
    src: "/vehicles/gmc-class-suv.jpg",
    labelKey: "fleetGmc" as const,
    altEn: "GMC-class charcoal SUV (placeholder fleet photo)",
    altAr: "سيارة فئة جي إم سي رصاصية (صورة مؤقتة للأسطول)",
  },
  {
    src: "/vehicles/lexus-class-suv.jpg",
    labelKey: "fleetLexus" as const,
    altEn: "Lexus-class pearl white SUV (placeholder fleet photo)",
    altAr: "سيارة فئة لكزس بيضاء لؤلؤية (صورة مؤقتة للأسطول)",
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

      <section
        aria-labelledby="hero-heading"
        style={{
          display: "grid",
          gap: 28,
          background: "#F6F3EC",
          marginInline: -8,
          padding: "8px 8px 0",
          animation: "hr-fade 480ms ease both",
        }}
      >
        <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(2.4rem, 6.5vw, 3.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              color: "#0B1F3A",
            }}
          >
            {t(locale, "heroTitle")}
          </p>
          <h1
            id="hero-heading"
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 3.2vw, 1.85rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              color: "#0B1F3A",
            }}
          >
            {t(locale, "heroHeadline")}
          </h1>
          <p style={{ margin: 0, fontSize: 18, color: "#526276", maxWidth: 540, lineHeight: 1.55 }}>
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
            <Link
              href={`/?lang=${locale}#notes`}
              style={{
                color: "#174A8B",
                fontWeight: 600,
                fontSize: 15,
                textUnderlineOffset: 4,
              }}
            >
              {t(locale, "howItWorks")}
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
            ) : null}
          </div>
        </div>

        <figure
          style={{
            margin: 0,
            borderRadius: 0,
            overflow: "hidden",
            background: "#E8E2D6",
            animation: "hr-rise 640ms ease 80ms both",
          }}
        >
          <Image
            src="/vehicles/haram-pack-suv.jpg"
            alt={locale === "ar" ? fleetShots[0].altAr : fleetShots[0].altEn}
            width={1280}
            height={720}
            priority
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              objectFit: "cover",
              maxHeight: 420,
            }}
          />
          <figcaption style={{ padding: "10px 4px 0", color: "#526276", fontSize: 13 }}>
            {t(locale, "fleetHaramPack")} · {t(locale, "fleetHint")}
          </figcaption>
        </figure>
      </section>

      <section
        id="book"
        aria-labelledby="book-heading"
        style={{ marginTop: 56, display: "grid", gap: 16, maxWidth: 560 }}
      >
        <h2 id="book-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "bookHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "bookHint")}</p>
        <BookingWidget locale={locale} routes={routes} />
      </section>

      <section
        id="fleet"
        aria-labelledby="fleet-heading"
        style={{ marginTop: 64, display: "grid", gap: 16 }}
      >
        <h2 id="fleet-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "fleetHeading")}
        </h2>
        <p style={{ margin: 0, color: "#526276", maxWidth: 640 }}>{t(locale, "fleetHint")}</p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {fleetShots.map((shot, idx) => (
            <li
              key={shot.src}
              style={{
                display: "grid",
                gap: 8,
                animation: `hr-fade 520ms ease ${100 + idx * 60}ms both`,
              }}
            >
              <Image
                src={shot.src}
                alt={locale === "ar" ? shot.altAr : shot.altEn}
                width={640}
                height={360}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover",
                  background: "#E8E2D6",
                }}
              />
              <span style={{ fontWeight: 600, color: "#0B1F3A" }}>{t(locale, shot.labelKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="quote-heading"
        style={{ marginTop: 64, display: "grid", gap: 12, maxWidth: 640 }}
      >
        <h2 id="quote-heading" className="hr-visually-hidden">
          {locale === "ar" ? "ملاحظة تجريبية" : "Pilot note"}
        </h2>
        <blockquote
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            fontSize: 22,
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

      <section id="notes" aria-labelledby="notes-heading" style={{ marginTop: 64, display: "grid", gap: 16 }}>
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

      <section id="routes" aria-labelledby="routes-heading" style={{ marginTop: 64, display: "grid", gap: 16 }}>
        <h2 id="routes-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "routes")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "routesHint")}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {routes.map((r) => (
            <li
              key={r.code}
              style={{
                background: "#fff",
                padding: "16px 18px",
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
        style={{ marginTop: 64, display: "grid", gap: 16 }}
      >
        <h2 id="pickup-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "pickupPoints")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "pickupHint")}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
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

      <section aria-labelledby="faq-heading" style={{ marginTop: 64, display: "grid", gap: 16, maxWidth: 720 }}>
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
        .hr-visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </SiteChrome>
  );
}
