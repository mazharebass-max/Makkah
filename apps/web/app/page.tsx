import type { Metadata } from "next";
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "home", locale, pathname: "/" });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);
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
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
          alignItems: "start",
          minHeight: "70vh",
        }}
        className="hr-hero-grid"
      >
        <div style={{ display: "grid", gap: 18, animation: "hr-fade 480ms ease both" }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <h1
            id="hero-heading"
            style={{
              margin: 0,
              fontSize: "clamp(2.6rem, 7vw, 4rem)",
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
            }}
          >
            {t(locale, "heroTitle")}
          </h1>
          <p style={{ margin: 0, fontSize: 18, color: "#526276", maxWidth: 540 }}>
            {t(locale, "heroBody")}
          </p>
          {/* Decorative atmosphere panel — not a photographic asset; keep aria-hidden */}
          <div
            aria-hidden
            style={{
              marginTop: 8,
              minHeight: 220,
              borderRadius: 20,
              background:
                "linear-gradient(135deg, rgba(11,31,58,0.92), rgba(23,74,139,0.75)), radial-gradient(circle at 20% 20%, rgba(198,161,91,0.35), transparent 45%)",
              boxShadow: "0 20px 60px rgba(11,31,58,0.18)",
            }}
          />
        </div>
        <BookingWidget locale={locale} routes={routes} />
      </section>

      <section id="routes" aria-labelledby="routes-heading" style={{ marginTop: 64, display: "grid", gap: 16 }}>
        <h2 id="routes-heading" style={{ margin: 0, fontSize: 28 }}>
          {t(locale, "routes")}
        </h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "routesHint")}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {routes.map((r, idx) => (
            <li
              key={r.code}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "16px 18px",
                boxShadow: "0 12px 40px rgba(11,31,58,0.06)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                animation: `hr-fade 520ms ease ${80 + idx * 40}ms both`,
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
                background: "#fff",
                borderRadius: 16,
                padding: "16px 18px",
                border: "1px solid rgba(11,31,58,0.06)",
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

      <section aria-labelledby="steps-heading" style={{ marginTop: 64, display: "grid", gap: 12, maxWidth: 640 }}>
        <h2 id="steps-heading" style={{ margin: 0 }}>
          {t(locale, "steps")}
        </h2>
        <ol style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.7 }}>
          <li>{t(locale, "step1")}</li>
          <li>{t(locale, "step2")}</li>
          <li>{t(locale, "step3")}</li>
        </ol>
        <h3 style={{ marginBottom: 0 }}>{t(locale, "safety")}</h3>
        <p style={{ marginTop: 0, color: "#526276" }}>{t(locale, "safetyBody")}</p>
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
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 860px) {
          .hr-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SiteChrome>
  );
}
