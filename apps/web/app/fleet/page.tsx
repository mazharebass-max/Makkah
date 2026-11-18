import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { t, type Locale } from "../../lib/i18n";
import { fleetRows } from "../../lib/public-content";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "fleet", locale, pathname: "/fleet" });
}

export default function FleetPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);

  return (
    <SiteChrome locale={locale}>
      <article style={{ display: "grid", gap: 24 }}>
        <header style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>{t(locale, "fleetHeading")}</h1>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6 }}>{t(locale, "fleetHint")}</p>
        </header>

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
                        width={140}
                        height={80}
                        style={{ width: 140, height: 80, objectFit: "cover", background: "#E8E2D6", flexShrink: 0 }}
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

        <p style={{ margin: 0 }}>
          <Link href={`/search?lang=${locale}`} style={{ color: "#174A8B", fontWeight: 600 }}>
            {t(locale, "searchCta")}
          </Link>
          {" · "}
          <Link href={`/contact?lang=${locale}`} style={{ color: "#174A8B", fontWeight: 600 }}>
            {t(locale, "contactNav")}
          </Link>
        </p>
      </article>
    </SiteChrome>
  );
}
