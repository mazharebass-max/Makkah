import Link from "next/link";
import { t, type Locale } from "../../lib/i18n";

export function LegalNav({ locale }: { locale: Locale }) {
  return (
    <nav
      aria-label={t(locale, "legal")}
      style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 }}
    >
      <Link href={`/legal/terms?lang=${locale}`}>{t(locale, "terms")}</Link>
      <Link href={`/legal/privacy?lang=${locale}`}>{t(locale, "privacy")}</Link>
      <Link href={`/legal/cancellation?lang=${locale}`}>{t(locale, "cancelPolicy")}</Link>
    </nav>
  );
}
