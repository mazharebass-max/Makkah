import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { t, type Locale } from "../../lib/i18n";
import { buildPageMetadata, localeFromSearchParams } from "../../lib/seo";
import { socialLinks } from "../../lib/social";
import { whatsappDisplay, whatsappE164, whatsappHref } from "../../lib/whatsapp";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Promise<Metadata> {
  const locale = localeFromSearchParams(searchParams);
  return buildPageMetadata({ key: "contact", locale, pathname: "/contact" });
}

export default function ContactPage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const locale: Locale = localeFromSearchParams(searchParams);
  const wa = whatsappE164();
  const social = socialLinks();
  const macros = [
    t(locale, "contactMacro1"),
    t(locale, "contactMacro2"),
    t(locale, "contactMacro3"),
  ];

  return (
    <SiteChrome locale={locale}>
      <article style={{ display: "grid", gap: 28, maxWidth: 720 }}>
        <header style={{ display: "grid", gap: 12 }}>
          <Badge tone="warning">{t(locale, "pilot")}</Badge>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.4rem)", letterSpacing: "-0.03em" }}>
            {t(locale, "contactTitle")}
          </h1>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.6 }}>{t(locale, "contactBody")}</p>
        </header>

        <section aria-labelledby="wa-heading" style={{ display: "grid", gap: 12 }}>
          <h2 id="wa-heading" style={{ margin: 0, fontSize: 22 }}>
            {t(locale, "contactWhatsAppHeading")}
          </h2>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "contactWhatsAppBody")}</p>
          {wa ? (
            <a
              href={whatsappHref(wa, t(locale, "whatsappPrefill"))}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                width: "fit-content",
                minHeight: 40,
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #25D366",
                background: "#F0FFF6",
                color: "#075E54",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="#25D366"
                  d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.85 14.12c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.19-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.89 1.05.93 1.94 1.22 2.21 1.36.28.14.44.12.6-.07.16-.19.7-.81.89-1.09.19-.28.37-.23.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.7-.17 1.38z"
                />
              </svg>
              {t(locale, "whatsappCta")} · {whatsappDisplay(wa)}
            </a>
          ) : (
            <p style={{ margin: 0, color: "#526276" }}>
              {locale === "ar"
                ? "رقم واتساب غير مضبوط بعد."
                : "WhatsApp number is not configured yet."}
            </p>
          )}
        </section>

        <section aria-labelledby="social-heading" style={{ display: "grid", gap: 12 }}>
          <h2 id="social-heading" style={{ margin: 0, fontSize: 22 }}>
            {t(locale, "contactSocialHeading")}
          </h2>
          {social.length > 0 ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {social.map((s) => (
                <li key={s.network}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      minHeight: 40,
                      alignItems: "center",
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(11,31,58,0.16)",
                      background: "#fff",
                      color: "#0B1F3A",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "contactSocialEmpty")}</p>
          )}
        </section>

        <section aria-labelledby="hours-heading" style={{ display: "grid", gap: 8 }}>
          <h2 id="hours-heading" style={{ margin: 0, fontSize: 22 }}>
            {t(locale, "contactHoursHeading")}
          </h2>
          <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "contactHoursBody")}</p>
        </section>

        <section aria-labelledby="macros-heading" style={{ display: "grid", gap: 10 }}>
          <h2 id="macros-heading" style={{ margin: 0, fontSize: 22 }}>
            {t(locale, "contactMacrosHeading")}
          </h2>
          <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.7 }}>
            {macros.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p style={{ margin: 0 }}>
            <Link href={`/?lang=${locale}#how-it-works`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
              {t(locale, "howItWorks")}
            </Link>
            {" · "}
            <Link href={`/search?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
              {t(locale, "searchCta")}
            </Link>
          </p>
        </section>
      </article>
    </SiteChrome>
  );
}
