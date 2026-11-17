import { Badge } from "@haramain/ui";
import { BookingWidget } from "../components/BookingWidget";
import { SiteChrome } from "../components/SiteChrome";
import { fetchRoutes } from "../lib/api";
import { t, type Locale } from "../lib/i18n";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = searchParams?.lang === "ar" ? "ar" : "en";
  const routes = await fetchRoutes();

  return (
    <SiteChrome locale={locale}>
      <section
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

      <section id="routes" style={{ marginTop: 64, display: "grid", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>{t(locale, "routes")}</h2>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "routesHint")}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {routes.map((r) => (
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

      <section style={{ marginTop: 64, display: "grid", gap: 12, maxWidth: 640 }}>
        <h2 style={{ margin: 0 }}>{t(locale, "steps")}</h2>
        <ol style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.7 }}>
          <li>{t(locale, "step1")}</li>
          <li>{t(locale, "step2")}</li>
          <li>{t(locale, "step3")}</li>
        </ol>
        <h3 style={{ marginBottom: 0 }}>{t(locale, "safety")}</h3>
        <p style={{ marginTop: 0, color: "#526276" }}>{t(locale, "safetyBody")}</p>
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
