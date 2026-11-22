import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button } from "@haramain/ui";
import { SiteChrome } from "../../../components/SiteChrome";
import { fetchPickupPoints, fetchRoutes } from "../../../lib/api";
import { t, type Locale } from "../../../lib/i18n";
import { corridorOps, corridorVisual } from "../../../lib/public-content";
import { absoluteUrl, localeFromSearchParams, siteUrl } from "../../../lib/seo";
import { whatsappE164, whatsappHref } from "../../../lib/whatsapp";

type Props = {
  params: { code: string };
  searchParams?: { lang?: string };
};

export async function generateStaticParams() {
  return [
    { code: "JED-MAKKAH" },
    { code: "MAKKAH-MADINAH" },
    { code: "MED-MADINAH" },
  ];
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  const code = decodeURIComponent(params.code).toUpperCase();
  const routes = await fetchRoutes();
  const route = routes.find((r) => r.code.toUpperCase() === code);
  const name =
    locale === "ar" && route?.nameAr
      ? route.nameAr
      : route?.nameEn ?? code;
  const title =
    locale === "ar"
      ? `${name} — حرمين رايد`
      : `${name} — Haramain Ride`;
  const description =
    locale === "ar"
      ? `نقل خاص مسودة على ممر ${name}. نقاط التقاء وأجرة مسودة — ليست عمليات مرخّصة مباشرة.`
      : `Private draft transfer on the ${name} corridor. Meeting points and draft fares — not live licensed operations.`;
  const pathname = `/routes/${encodeURIComponent(code)}`;
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

export default async function CorridorLandingPage({ params, searchParams }: Props) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const code = decodeURIComponent(params.code).toUpperCase();
  const [routes, pickupPoints] = await Promise.all([fetchRoutes(), fetchPickupPoints()]);
  const route = routes.find((r) => r.code.toUpperCase() === code);
  if (!route) notFound();

  const ops = corridorOps(locale).find((c) =>
    c.codes.some((x) => x.toUpperCase() === code),
  );
  const visual = corridorVisual(code);
  const title = locale === "ar" && route.nameAr ? route.nameAr : route.nameEn;
  const bookHref = `/?lang=${locale}&routeCode=${encodeURIComponent(route.code)}#book`;
  const wa = whatsappE164();
  const waPrefill =
    locale === "ar"
      ? `مرحباً حرمين رايد — أسأل عن ممر ${route.code}`
      : `Hello Haramain Ride — question about corridor ${route.code}`;
  const waHref = wa ? whatsappHref(wa, waPrefill) : null;
  const relatedPickups = pickupPoints.filter((p) => {
    const z = p.zone.code.toUpperCase();
    if (code.startsWith("JED")) return z.includes("JED") || z.includes("MAK");
    if (code.startsWith("MED")) return z.includes("MED") || z.includes("MAD");
    if (code.includes("MAKKAH") && code.includes("MADINAH"))
      return z.includes("MAK") || z.includes("MAD") || z.includes("MED");
    return true;
  });

  return (
    <SiteChrome locale={locale}>
      <article style={{ display: "grid", gap: 28, maxWidth: 880 }}>
        <header style={{ display: "grid", gap: 12 }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <p style={{ margin: 0, color: "#526276", fontSize: 13, letterSpacing: "0.04em" }}>
            {route.code}
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "#0B1F3A" }}>
            {title}
          </h1>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6, maxWidth: 640 }}>
            {t(locale, "corridorLandingHint")}
          </p>
        </header>

        <div
          style={{
            overflow: "hidden",
            background: "#E8EDF5",
            aspectRatio: "21 / 9",
            borderBottom: "3px solid #1A5FBF",
          }}
        >
          <Image
            src={visual.src}
            alt={locale === "ar" ? visual.altAr : visual.altEn}
            width={1200}
            height={514}
            priority
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {ops ? (
          <section aria-labelledby="ops-heading" style={{ display: "grid", gap: 10 }}>
            <h2 id="ops-heading" style={{ margin: 0, fontSize: 22, color: "#0B1F3A" }}>
              {t(locale, "corridorOpsHeading")}
            </h2>
            <div style={{ color: "#526276", fontSize: 15, lineHeight: 1.65, display: "grid", gap: 6 }}>
              <div>
                <strong style={{ color: "#0B1F3A" }}>{t(locale, "corridorOpsPickup")}: </strong>
                {ops.pickup}
              </div>
              <div>
                <strong style={{ color: "#0B1F3A" }}>{t(locale, "corridorOpsDropoff")}: </strong>
                {ops.dropoff}
              </div>
              <div>
                <strong style={{ color: "#0B1F3A" }}>{t(locale, "corridorOpsDuration")}: </strong>
                {ops.duration}
              </div>
              <div>
                <strong style={{ color: "#0B1F3A" }}>{t(locale, "corridorOpsNote")}: </strong>
                {ops.note}
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="inc-heading" style={{ display: "grid", gap: 10 }}>
          <h2 id="inc-heading" style={{ margin: 0, fontSize: 22, color: "#0B1F3A" }}>
            {t(locale, "corridorInclusionsHeading")}
          </h2>
          <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.6 }}>
            <li>{t(locale, "corridorInclusion1")}</li>
            <li>{t(locale, "corridorInclusion2")}</li>
            <li>{t(locale, "corridorInclusion3")}</li>
            <li>{t(locale, "corridorInclusion4")}</li>
          </ul>
        </section>

        <section aria-labelledby="wait-heading" style={{ display: "grid", gap: 8 }}>
          <h2 id="wait-heading" style={{ margin: 0, fontSize: 22, color: "#0B1F3A" }}>
            {t(locale, "corridorWaitingHeading")}
          </h2>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6 }}>
            {t(locale, "corridorWaitingBody")}
          </p>
        </section>

        {relatedPickups.length ? (
          <section aria-labelledby="meet-heading" style={{ display: "grid", gap: 10 }}>
            <h2 id="meet-heading" style={{ margin: 0, fontSize: 22, color: "#0B1F3A" }}>
              {t(locale, "pickupPoints")}
            </h2>
            <p style={{ margin: 0, color: "#526276" }}>{t(locale, "pickupHint")}</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 0 }}>
              {relatedPickups.map((p) => (
                <li
                  key={p.code}
                  style={{
                    padding: "14px 0",
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
                      {p.code} · {p.kind}
                    </div>
                  </div>
                  <Badge tone="warning">{p.draftLabel}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={bookHref}>
            <Button type="button">{t(locale, "corridorBookCta")}</Button>
          </Link>
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary">
                {t(locale, "whatsappCta")}
              </Button>
            </a>
          ) : null}
          <Link href={`/routes?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
            {t(locale, "routesNav")}
          </Link>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: title,
              serviceType: "Private airport and hotel transfer",
              provider: {
                "@type": "Organization",
                name: "Haramain Ride",
                url: siteUrl(),
              },
              areaServed: ["Jeddah", "Makkah", "Madinah"],
              description:
                locale === "ar"
                  ? "نقل أرضي مسودة للحجاج والزوار — ليست عمليات مرخّصة مباشرة."
                  : "Draft private ground transfer for pilgrims and visitors — not live licensed operations.",
              url: absoluteUrl(`/routes/${encodeURIComponent(code)}`, locale),
            }),
          }}
        />
      </article>
    </SiteChrome>
  );
}
