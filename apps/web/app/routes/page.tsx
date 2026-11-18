import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { fetchPickupPoints, fetchRoutes } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { corridorOps } from "../../lib/public-content";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "routes", locale, pathname: "/routes" });
}

export default async function RoutesPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const [routes, pickupPoints] = await Promise.all([fetchRoutes(), fetchPickupPoints()]);
  const ops = corridorOps(locale);

  return (
    <SiteChrome locale={locale}>
      <article style={{ display: "grid", gap: 32 }}>
        <header style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>{t(locale, "routes")}</h1>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6 }}>{t(locale, "routesHint")}</p>
        </header>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0, maxWidth: 720 }}>
          {routes.map((r) => (
            <li
              key={r.code}
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
                <strong>{locale === "ar" && r.nameAr ? r.nameAr : r.nameEn}</strong>
                <div style={{ color: "#526276", fontSize: 13 }}>{r.code}</div>
              </div>
              <Badge tone="warning">{r.draftLabel}</Badge>
            </li>
          ))}
        </ul>

        <section style={{ display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>{t(locale, "corridorOpsHeading")}</h2>
          <p style={{ margin: 0, color: "#526276", maxWidth: 720 }}>{t(locale, "corridorOpsHint")}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 20 }}>
            {ops.map((c) => {
              const live = routes.find((r) => c.codes.includes(r.code));
              const title = locale === "ar" ? live?.nameAr || c.titleAr : live?.nameEn || c.titleEn;
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

        <section style={{ display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>{t(locale, "pickupPoints")}</h2>
          <p style={{ margin: 0, color: "#526276" }}>{t(locale, "pickupHint")}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0, maxWidth: 720 }}>
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
          </ul>
        </section>

        <p style={{ margin: 0 }}>
          <Link href={`/search?lang=${locale}`} style={{ color: "#174A8B", fontWeight: 600 }}>
            {t(locale, "searchCta")}
          </Link>
        </p>
      </article>
    </SiteChrome>
  );
}
