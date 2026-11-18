"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../../components/SiteChrome";
import { API } from "../../../lib/api";
import { t, type Locale } from "../../../lib/i18n";
import { readAccessToken, saveAccessToken } from "../../../lib/session";

type TripDetail = {
  id: string;
  reference: string;
  status: string;
  scheduledAt: string;
  totalHalalas: number;
  currency: string;
  contactName?: string;
  contactPhone?: string;
  route?: { nameEn: string; nameAr?: string | null; code: string };
  category?: { nameEn: string; nameAr?: string | null };
  tripTimeline?: { from: string | null; to: string; at: string; note?: string | null }[];
};

export default function TripDetailPage() {
  const params = useSearchParams();
  const routeParams = useParams<{ id: string }>();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const id = routeParams.id;

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("customer@haramain.local");
  const [password, setPassword] = useState("CustomerDev!234");
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      const res = await fetch(`${API}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Failed to load trip");
        return;
      }
      setTrip(body);
    })();
  }, [token, id]);

  async function login() {
    setError(null);
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.message ?? "Login failed");
      return;
    }
    saveAccessToken(body.accessToken);
    setToken(body.accessToken);
  }

  return (
    <SiteChrome locale={locale}>
      <div style={{ display: "grid", gap: 18, maxWidth: 720 }}>
        <Link href={`/trips?lang=${locale}`}>{t(locale, "backToTrips")}</Link>
        <h1 style={{ margin: 0 }}>{t(locale, "viewTrip")}</h1>

        {!token ? (
          <section style={{ display: "grid", gap: 12, maxWidth: 420 }}>
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="button" onClick={() => void login()}>
              {t(locale, "signIn")}
            </Button>
          </section>
        ) : trip ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 20,
              boxShadow: "0 12px 36px rgba(11,31,58,0.07)",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 20 }}>
                {locale === "ar" && trip.route?.nameAr
                  ? trip.route.nameAr
                  : trip.route?.nameEn ?? trip.reference}
              </strong>
              <Badge>{trip.status}</Badge>
            </div>
            <div style={{ color: "#526276" }}>
              {t(locale, "tripReference")}: {trip.reference}
            </div>
            <div style={{ color: "#526276" }}>
              {new Date(trip.scheduledAt).toLocaleString()} ·{" "}
              {locale === "ar" && trip.category?.nameAr
                ? trip.category.nameAr
                : trip.category?.nameEn}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {(trip.totalHalalas / 100).toFixed(2)} {trip.currency}
            </div>
            <Badge tone="warning">{t(locale, "sandboxOnly")}</Badge>
            <h2 style={{ margin: "8px 0 0", fontSize: 18 }}>{t(locale, "timeline")}</h2>
            <ol style={{ margin: 0, paddingInlineStart: 20, display: "grid", gap: 8 }}>
              {(trip.tripTimeline ?? []).map((ev, i) => (
                <li key={`${ev.at}-${i}`}>
                  <strong>{ev.to}</strong>
                  <div style={{ color: "#526276", fontSize: 13 }}>
                    {new Date(ev.at).toLocaleString()}
                    {ev.note ? ` · ${ev.note}` : ""}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p>…</p>
        )}
        {error ? (
          <p role="alert" style={{ color: "#B42318" }}>
            {error}
          </p>
        ) : null}
      </div>
    </SiteChrome>
  );
}
