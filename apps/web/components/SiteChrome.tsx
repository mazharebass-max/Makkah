"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PublicShell } from "@haramain/ui";
import { dirFor, otherLocale, t, type Locale } from "../lib/i18n";

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
        nav={
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={`/?lang=${locale}#routes`}>{t(locale, "routes")}</Link>
            <Link href={`/search?lang=${locale}`}>{t(locale, "searchCta")}</Link>
            <Link href={`/trips?lang=${locale}`}>{t(locale, "myTrips")}</Link>
            <Link href={`/providers/apply?lang=${locale}`}>{t(locale, "providerApply")}</Link>
            <Link href={`/legal/terms?lang=${locale}`}>{t(locale, "legal")}</Link>
            <Link href={`/login?lang=${locale}`}>{t(locale, "signIn")}</Link>
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
      >
        {children}
      </PublicShell>
    </div>
  );
}
