"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@haramain/ui";
import { defaultScheduleIso, type RouteRow } from "../lib/api";
import { t, type Locale } from "../lib/i18n";

export function BookingWidget({
  locale,
  routes,
}: {
  locale: Locale;
  routes: RouteRow[];
}) {
  const router = useRouter();
  const [routeCode, setRouteCode] = useState(routes[0]?.code ?? "JED-MAKKAH");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleIso().slice(0, 16));
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(2);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const iso = new Date(scheduledAt).toISOString();
    const q = new URLSearchParams({
      lang: locale,
      routeCode,
      scheduledAt: iso,
      passengers: String(passengers),
      luggage: String(luggage),
    });
    router.push(`/search?${q.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "grid",
        gap: 14,
        background: "rgba(255,255,255,0.92)",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 18px 50px rgba(11,31,58,0.12)",
        maxWidth: 520,
        width: "100%",
      }}
    >
      <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
        {t(locale, "from")}
        <select
          value={routeCode}
          onChange={(e) => setRouteCode(e.target.value)}
          style={{
            minHeight: 44,
            borderRadius: 12,
            border: "1px solid rgba(11,31,58,0.18)",
            padding: "10px 12px",
            fontFamily: "inherit",
            fontSize: 16,
          }}
        >
          {routes.map((r) => (
            <option key={r.code} value={r.code}>
              {locale === "ar" && r.nameAr ? r.nameAr : r.nameEn}
            </option>
          ))}
        </select>
      </label>
      <Input
        label={t(locale, "when")}
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label={t(locale, "passengers")}
          type="number"
          min={1}
          max={20}
          value={passengers}
          onChange={(e) => setPassengers(Number(e.target.value))}
        />
        <Input
          label={t(locale, "luggage")}
          type="number"
          min={0}
          max={40}
          value={luggage}
          onChange={(e) => setLuggage(Number(e.target.value))}
        />
      </div>
      <Button type="submit">{t(locale, "searchCta")}</Button>
    </form>
  );
}
