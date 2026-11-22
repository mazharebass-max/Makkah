"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Button } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { t, type Locale } from "../../lib/i18n";
import { whatsappE164, whatsappHref } from "../../lib/whatsapp";

export default function ConfirmationPage() {
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const bookingId = params.get("bookingId") ?? "";
  const reference = params.get("ref") ?? "";
  const wa = whatsappE164();
  const waPrefill = reference
    ? `${t(locale, "confirmWhatsAppPrefill")} ${reference}`
    : t(locale, "whatsappPrefill");
  const waHref = wa ? whatsappHref(wa, waPrefill) : null;

  return (
    <SiteChrome locale={locale}>
      <div style={{ display: "grid", gap: 18, maxWidth: 560 }}>
        <Badge tone="warning">{t(locale, "sandboxOnly")}</Badge>
        <h1 style={{ margin: 0 }}>{t(locale, "confirmation")}</h1>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "paidSandbox")}</p>
        {reference ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 20,
              boxShadow: "0 12px 36px rgba(11,31,58,0.07)",
            }}
          >
            <div style={{ color: "#526276", fontSize: 13 }}>{t(locale, "tripReference")}</div>
            <strong style={{ fontSize: 22 }}>{reference}</strong>
          </div>
        ) : null}

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{t(locale, "confirmNextSteps")}</h2>
          <ul style={{ margin: 0, paddingInlineStart: 20, color: "#526276", lineHeight: 1.55 }}>
            <li>{t(locale, "corridorInclusion2")}</li>
            <li>{t(locale, "corridorWaitingBody")}</li>
          </ul>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {bookingId ? (
            <Link href={`/trips/${bookingId}?lang=${locale}`}>
              <Button type="button">{t(locale, "viewTrip")}</Button>
            </Link>
          ) : null}
          <Link href={`/trips?lang=${locale}`}>
            <Button type="button" variant="secondary">
              {t(locale, "continueTrips")}
            </Button>
          </Link>
          <Link href={`/notifications?lang=${locale}`}>
            <Button type="button" variant="secondary">
              {t(locale, "viewNotifications")}
            </Button>
          </Link>
          <Link
            href={
              bookingId
                ? `/support?lang=${locale}&bookingId=${bookingId}`
                : `/support?lang=${locale}`
            }
          >
            <Button type="button" variant="secondary">
              {t(locale, "getSupport")}
            </Button>
          </Link>
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary">
                {t(locale, "confirmWhatsApp")}
              </Button>
            </a>
          ) : null}
        </div>
      </div>
    </SiteChrome>
  );
}
