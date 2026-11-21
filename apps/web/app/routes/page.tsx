import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { fetchPickupPoints, fetchRoutes } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { corridorOps, corridorVisual, placeHighlights } from "../../lib/public-content";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "routes", locale, pathname: "/routes" });
}

/** Haram Pak + Madinah context pics lead the routes page (owner ask). */
const routesPlacePics = placeHighlights.filter(
  (p) => p.src.includes("haram-pack") || p.src.includes("madinah"),
);

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

        <section aria-labelledby="routes-places-heading" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 6, maxWidth: 720 }}>
            <h2 id="routes-places-heading" style={{ margin: 0, fontSize: 22, color: "#0B1F3A" }}>
              {t(locale, "placesHeading")}
            </h2>
            <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "placesHint")}</p>
          </div>
          <div
            className="hr-routes-places"
            style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}
          >
            {routesPlacePics.map((p) => (
              <figure key={p.src} style={{ margin: 0, display: "grid", gap: 8 }}>
                <div
                  style={{
                    overflow: "hidden",
                    background: "#E8EDF5",
                    aspectRatio: "16 / 10",
                    borderBottom: "3px solid #1A5FBF",
                  }}
                >
                  <Image
                    src={p.src}
                    alt={locale === "ar" ? p.altAr : p.altEn}
                    width={800}
                    height={500}
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                    priority
                  />
                </div>
                <figcaption style={{ display: "grid", gap: 2 }}>
                  <strong style={{ color: "#0B1F3A", fontSize: 16 }}>{t(locale, p.titleKey)}</strong>
                  <span style={{ color: "#526276", fontSize: 14, lineHeight: 1.45 }}>{t(locale, p.bodyKey)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0, maxWidth: 900 }}>
          {routes.map((r) => {
            const visual = corridorVisual(r.code);
            return (
              <li
                key={r.code}
                style={{
                  padding: "18px 0",
                  borderBottom: "1px solid rgba(11,31,58,0.08)",
                  display: "grid",
                  gridTemplateColumns: "minmax(160px, 220px) minmax(0, 1fr) auto",
                  gap: 16,
                  alignItems: "center",
                }}
                className="hr-route-row"
              >
                <div
                  style={{
                    overflow: "hidden",
                    background: "#E8EDF5",
                    width: "100%",
                    aspectRatio: "16 / 10",
                  }}
                >
                  <Image
                    src={visual.src}
                    alt={locale === "ar" ? visual.altAr : visual.altEn}
                    width={440}
                    height={275}
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div>
                  <strong style={{ fontSize: 17, color: "#0B1F3A" }}>
                    {locale === "ar" && r.nameAr ? r.nameAr : r.nameEn}
                  </strong>
                  <div style={{ color: "#526276", fontSize: 13, marginTop: 4 }}>{r.code}</div>
                </div>
                <Badge tone="warning">{r.draftLabel}</Badge>
              </li>
            );
          })}
        </ul>

        <section style={{ display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>{t(locale, "corridorOpsHeading")}</h2>
          <p style={{ margin: 0, color: "#526276", maxWidth: 720 }}>{t(locale, "corridorOpsHint")}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 24 }}>
            {ops.map((c) => {
              const live = routes.find((r) => c.codes.includes(r.code));
              const title = locale === "ar" ? live?.nameAr || c.titleAr : live?.nameEn || c.titleEn;
              const visual = corridorVisual(c.codes[0] ?? "");
              return (
                <li
                  key={c.codes.join("-")}
                  style={{
                    paddingBottom: 20,
                    borderBottom: "1px solid rgba(11,31,58,0.08)",
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 280px) minmax(0, 1fr)",
                    gap: 18,
                    alignItems: "start",
                    maxWidth: 900,
                  }}
                  className="hr-ops-row"
                >
                  <div
                    style={{
                      overflow: "hidden",
                      background: "#E8EDF5",
                      aspectRatio: "16 / 10",
                      width: "100%",
                    }}
                  >
                    <Image
                      src={visual.src}
                      alt={locale === "ar" ? visual.altAr : visual.altEn}
                      width={560}
                      height={350}
                      style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
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
          <Link href={`/?lang=${locale}#book`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
            {t(locale, "searchCta")}
          </Link>
        </p>

        <style>{`
          @media (max-width: 720px) {
            .hr-routes-places { grid-template-columns: 1fr !important; }
            .hr-route-row, .hr-ops-row {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </article>
    </SiteChrome>
  );
}
