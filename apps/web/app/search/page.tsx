"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { API, defaultScheduleIso } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";

type SearchRow = {
  category: {
    code: string;
    nameEn: string;
    nameAr?: string | null;
    passengerCap: number;
    luggageCap: number;
    draftLabel: string;
  };
  available: boolean;
  availableCount: number;
  unavailableReason: string | null;
  estimate: {
    totalHalalas: number;
    currency: string;
    lines: { label: string; amountHalalas: number; draftLabel: string }[];
  } | null;
};

function formatMoney(halalas: number, currency: string) {
  return `${(halalas / 100).toFixed(2)} ${currency}`;
}

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const routeCode = params.get("routeCode") ?? "JED-MAKKAH";
  const scheduledAt = params.get("scheduledAt") ?? defaultScheduleIso();
  const passengers = Number(params.get("passengers") ?? 2);
  const luggage = Number(params.get("luggage") ?? 2);

  const [rows, setRows] = useState<SearchRow[]>([]);
  const [policy, setPolicy] = useState<{ summaryEn: string; summaryAr: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState<string | null>(null);

  const query = useMemo(
    () => ({ routeCode, scheduledAt, passengers, luggage }),
    [routeCode, scheduledAt, passengers, luggage],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          routeCode: query.routeCode,
          scheduledAt: query.scheduledAt,
          passengers: String(query.passengers),
          luggage: String(query.luggage),
        });
        const res = await fetch(`${API}/search?${qs}`);
        const body = await res.json();
        if (!res.ok) {
          setError(body?.message?.message ?? body?.message ?? "Search failed");
          setRows([]);
          return;
        }
        setRows(body.data ?? []);
        setPolicy(body.cancellationPolicy ?? null);
        setNote(body.inventoryNote ?? null);
      } catch {
        setError(t(locale, "emptySearch"));
      } finally {
        setLoading(false);
      }
    })();
  }, [query, locale]);

  async function selectCategory(code: string) {
    setQuoting(code);
    setError(null);
    try {
      const res = await fetch(`${API}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeCode,
          categoryCode: code,
          scheduledAt,
          passengers,
          luggage,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message?.message ?? body?.message ?? "Quote failed");
        return;
      }
      router.push(`/checkout?lang=${locale}&quoteId=${body.id}`);
    } finally {
      setQuoting(null);
    }
  }

  return (
    <SiteChrome locale={locale}>
      <div style={{ display: "grid", gap: 20, maxWidth: 880 }}>
        <h1 style={{ margin: 0, fontSize: 32 }}>{t(locale, "searchCta")}</h1>
        <p style={{ margin: 0, color: "#526276" }}>
          {routeCode} · {passengers} {t(locale, "passengers")} · {luggage} {t(locale, "luggage")}
        </p>
        {note ? <Badge tone="warning">{note}</Badge> : null}
        {error ? (
          <p role="alert" style={{ color: "#B42318" }}>
            {error}
          </p>
        ) : null}
        {loading ? <p>{locale === "ar" ? "جارٍ التحميل…" : "Loading…"}</p> : null}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
          {rows.map((row) => {
            const name =
              locale === "ar" && row.category.nameAr
                ? row.category.nameAr
                : row.category.nameEn;
            return (
              <li
                key={row.category.code}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: 18,
                  boxShadow: "0 12px 36px rgba(11,31,58,0.07)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 18 }}>{name}</strong>
                    <div style={{ color: "#526276", fontSize: 13 }}>
                      {row.category.passengerCap} pax · {row.category.luggageCap} bags
                    </div>
                  </div>
                  <Badge tone={row.available ? "success" : "danger"}>
                    {row.available
                      ? `${t(locale, "available")} · ${row.availableCount}`
                      : t(locale, "unavailable")}
                  </Badge>
                </div>
                <Badge tone="warning">{row.category.draftLabel}</Badge>
                {!row.available ? (
                  <p style={{ margin: 0, color: "#B42318" }}>
                    {row.unavailableReason === "CAPACITY"
                      ? t(locale, "capacity")
                      : t(locale, "noInventory")}
                  </p>
                ) : null}
                {row.estimate ? (
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {formatMoney(row.estimate.totalHalalas, row.estimate.currency)}
                    </div>
                    <details>
                      <summary>{t(locale, "priceBreakdown")}</summary>
                      <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
                        {row.estimate.lines.map((l) => (
                          <li key={l.label}>
                            {l.label}: {formatMoney(l.amountHalalas, row.estimate!.currency)}{" "}
                            <em style={{ color: "#7a5d1d", fontSize: 12 }}>{l.draftLabel}</em>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ) : null}
                <Button
                  disabled={!row.available || quoting === row.category.code}
                  onClick={() => void selectCategory(row.category.code)}
                >
                  {t(locale, "select")}
                </Button>
              </li>
            );
          })}
        </ul>

        {policy ? (
          <section style={{ marginTop: 12 }}>
            <h2 style={{ fontSize: 20 }}>{t(locale, "cancellation")}</h2>
            <p style={{ color: "#526276" }}>
              {locale === "ar" ? policy.summaryAr : policy.summaryEn}
            </p>
            <Badge tone="warning">{t(locale, "draft")}</Badge>
          </section>
        ) : null}
      </div>
    </SiteChrome>
  );
}
