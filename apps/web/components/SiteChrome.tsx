"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PublicShell } from "@haramain/ui";
import { dirFor, otherLocale, t, type Locale } from "../lib/i18n";
import { whatsappDisplay, whatsappE164, whatsappHref } from "../lib/whatsapp";

export function SiteChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const wa = whatsappE164();

  function switchLocale() {
    const next = otherLocale(locale);
    const params = new URLSearchParams(search.toString());
    params.set("lang", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div dir={dirFor(locale)} lang={locale}>
      <PublicShell
        locale={locale}
        brand={
          <Link
            href={`/?lang=${locale}`}
            style={{ textDecoration: "none", color: "inherit" }}
            aria-label={t(locale, "brand")}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#0B1F3A",
                  lineHeight: 1.05,
                }}
              >
                {t(locale, "brand")}
              </span>
              <span style={{ color: "#526276", fontSize: 12 }}>{t(locale, "tagline")}</span>
            </span>
          </Link>
        }
        nav={
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={`/?lang=${locale}#how-it-works`}>{t(locale, "howItWorks")}</Link>
            <Link href={`/?lang=${locale}#routes`}>{t(locale, "routes")}</Link>
            <Link href={`/?lang=${locale}#corridor-ops`}>{t(locale, "corridorOpsHeading")}</Link>
            <Link href={`/?lang=${locale}#pickup-points`}>{t(locale, "pickupPoints")}</Link>
            <Link href={`/search?lang=${locale}`}>{t(locale, "searchCta")}</Link>
            <Link href={`/providers/apply?lang=${locale}`}>{t(locale, "providerApply")}</Link>
            <Link href={`/legal/terms?lang=${locale}`}>{t(locale, "legal")}</Link>
            <Link href={`/trips?lang=${locale}`}>{t(locale, "myTrips")}</Link>
            <Link href={`/login?lang=${locale}`}>{t(locale, "signIn")}</Link>
            {wa ? (
              <a
                href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#087F6D", fontWeight: 600 }}
              >
                {t(locale, "whatsappCta")}
              </a>
            ) : null}
            <button
              type="button"
              onClick={switchLocale}
              style={{
                minHeight: 44,
                border: "1px solid rgba(11,31,58,0.16)",
                background: "#fff",
                borderRadius: 12,
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t(locale, "language")}
            </button>
          </div>
        }
        footer={
          <footer
            style={{
              marginTop: 48,
              paddingTop: 28,
              borderTop: "1px solid rgba(11,31,58,0.08)",
              display: "grid",
              gap: 12,
              color: "#526276",
              fontSize: 14,
            }}
          >
            <p style={{ margin: 0 }}>{t(locale, "pilot")}</p>
            {wa ? (
              <p style={{ margin: 0 }}>
                <a
                  href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#087F6D", fontWeight: 600 }}
                >
                  {t(locale, "whatsappCta")} · {whatsappDisplay(wa)}
                </a>
              </p>
            ) : null}
            <nav aria-label={t(locale, "legal")} style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link href={`/legal/terms?lang=${locale}`}>{t(locale, "terms")}</Link>
              <Link href={`/legal/privacy?lang=${locale}`}>{t(locale, "privacy")}</Link>
              <Link href={`/legal/cancellation?lang=${locale}`}>{t(locale, "cancelPolicy")}</Link>
              <Link href={`/providers/apply?lang=${locale}`}>{t(locale, "providerApply")}</Link>
              <Link href={`/search?lang=${locale}`}>{t(locale, "searchCta")}</Link>
            </nav>
          </footer>
        }
      >
        {children}
      </PublicShell>
    </div>
  );
}
