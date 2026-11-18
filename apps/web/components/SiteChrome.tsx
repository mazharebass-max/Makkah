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
            <Link href={`/how-it-works?lang=${locale}`}>{t(locale, "howItWorks")}</Link>
            <Link href={`/routes?lang=${locale}`}>{t(locale, "tripsOfferedHeading")}</Link>
            <Link href={`/fleet?lang=${locale}`}>{t(locale, "fleetNav")}</Link>
            <Link href={`/?lang=${locale}#book`}>{t(locale, "searchCta")}</Link>
            <Link href={`/contact?lang=${locale}`}>{t(locale, "contactNav")}</Link>
            <Link href={`/trips?lang=${locale}`}>{t(locale, "myTrips")}</Link>
            <Link href={`/login?lang=${locale}`}>{t(locale, "signIn")}</Link>
            <Link href={`/signup?lang=${locale}`}>{t(locale, "signUp")}</Link>
            {wa ? (
              <a
                href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t(locale, "whatsappCta")} ${whatsappDisplay(wa)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 32,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #25D366",
                  background: "#F0FFF6",
                  color: "#075E54",
                  fontWeight: 600,
                  fontSize: 13,
                  lineHeight: 1,
                  textDecoration: "none",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="#25D366"
                    d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.85 14.12c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.89 1.05.93 1.94 1.22 2.21 1.36.28.14.44.12.6-.07.16-.19.7-.81.89-1.09.19-.28.37-.23.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.7-.17 1.38z"
                  />
                </svg>
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
              <Link href={`/contact?lang=${locale}`}>{t(locale, "contactNav")}</Link>
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
