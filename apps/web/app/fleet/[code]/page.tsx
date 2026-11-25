import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button } from "@haramain/ui";
import { SiteChrome } from "../../../components/SiteChrome";
import { fetchRoutes } from "../../../lib/api";
import { t, type Locale } from "../../../lib/i18n";
import { fleetByCode, fleetRows } from "../../../lib/public-content";
import { absoluteUrl, localeFromSearchParams, siteUrl } from "../../../lib/seo";
import { whatsappE164, whatsappHref } from "../../../lib/whatsapp";

type Props = {
  params: { code: string };
  searchParams?: { lang?: string };
};

export function generateStaticParams() {
  return fleetRows.map((r) => ({ code: r.code }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  const row = fleetByCode(params.code);
  if (!row) {
    return { title: "Fleet — Haramain Ride" };
  }
  const name = t(locale, row.labelKey);
  const title =
    locale === "ar" ? `${name} — حرمين رايد` : `${name} — Haramain Ride`;
  const description = t(locale, row.bodyKey);
  const pathname = `/fleet/${encodeURIComponent(row.code)}`;
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(pathname, locale),
      languages: {
        en: absoluteUrl(pathname, "en"),
        ar: absoluteUrl(pathname, "ar"),
      },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(pathname, locale),
      siteName: "Haramain Ride",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      type: "website",
    },
  };
}

export default async function FleetDetailPage({ params, searchParams }: Props) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const row = fleetByCode(params.code);
  if (!row) notFound();

  const routes = await fetchRoutes();
  const defaultRoute = routes[0]?.code ?? "JED-MAKKAH";
  const bookHref = `/?lang=${locale}&routeCode=${encodeURIComponent(defaultRoute)}#book`;
  const searchHref = `/search?lang=${locale}&routeCode=${encodeURIComponent(defaultRoute)}&passengers=${row.passengers}&luggage=${row.luggage}`;
  const wa = whatsappE164();
  const waPrefill =
    locale === "ar"
      ? `مرحباً حرمين رايد — أسأل عن فئة ${t(locale, row.labelKey)}`
      : `Hello Haramain Ride — question about ${t(locale, row.labelKey)}`;
  const waHref = wa ? whatsappHref(wa, waPrefill) : null;

  return (
    <SiteChrome locale={locale}>
      <article style={{ display: "grid", gap: 24, maxWidth: 880 }}>
        <Link href={`/fleet?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600, width: "fit-content" }}>
          ← {t(locale, "fleetDetailBack")}
        </Link>
        <header style={{ display: "grid", gap: 10 }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "#0B1F3A" }}>
            {t(locale, row.labelKey)}
          </h1>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6, maxWidth: 640 }}>
            {t(locale, row.bodyKey)}
          </p>
        </header>

        <div
          style={{
            overflow: "hidden",
            background: "#E8EDF5",
            aspectRatio: "16 / 9",
            borderBottom: "3px solid #F0771F",
          }}
        >
          <Image
            src={row.src}
            alt={locale === "ar" ? row.altAr : row.altEn}
            width={1200}
            height={675}
            priority
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: "#0B1F3A" }}>{t(locale, "fleetDetailCapacity")}</h2>
          <p style={{ margin: 0, color: "#526276", fontSize: 16 }}>
            {t(locale, row.capKey)} · {row.passengers} / {row.luggage}
          </p>
          <Badge tone="warning">{t(locale, "fleetFareDraft")}</Badge>
          <p style={{ margin: 0, color: "#526276", fontSize: 14, lineHeight: 1.55, maxWidth: 640 }}>
            {t(locale, "fleetDetailNote")}
          </p>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={searchHref}>
            <Button type="button">{t(locale, "fleetDetailBook")}</Button>
          </Link>
          <Link href={bookHref}>
            <Button type="button" variant="secondary">
              {t(locale, "quickBook")}
            </Button>
          </Link>
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary">
                {t(locale, "whatsappCta")}
              </Button>
            </a>
          ) : null}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: t(locale, row.labelKey),
              description: t(locale, row.bodyKey),
              brand: { "@type": "Brand", name: "Haramain Ride" },
              url: absoluteUrl(`/fleet/${row.code}`, locale),
              image: `${siteUrl()}${row.src}`,
            }),
          }}
        />
      </article>
    </SiteChrome>
  );
}
