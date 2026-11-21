"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { API } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { readAccessToken, saveAccessToken } from "../../lib/session";

type TripRow = {
  id: string;
  reference: string;
  status: string;
  scheduledAt: string;
  totalHalalas: number;
  currency: string;
  route?: { nameEn: string; nameAr?: string | null; code: string };
  category?: { nameEn: string; nameAr?: string | null };
};

export default function TripsPage() {
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("customer@haramain.local");
  const [password, setPassword] = useState("CustomerDev!234");
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const res = await fetch(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Failed to load trips");
        return;
      }
      setTrips(body.data ?? []);
    })();
  }, [token]);

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
        <h1 style={{ margin: 0 }}>{t(locale, "myTrips")}</h1>
        <Badge tone="warning">{t(locale, "pilot")}</Badge>

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
        ) : trips.length === 0 ? (
          <p style={{ color: "#526276" }}>{t(locale, "emptyTrips")}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {trips.map((trip) => (
              <li
                key={trip.id}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: "0 12px 36px rgba(11,31,58,0.06)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>
                    {locale === "ar" && trip.route?.nameAr
                      ? trip.route.nameAr
                      : trip.route?.nameEn ?? trip.reference}
                  </strong>
                  <Badge>{trip.status}</Badge>
                </div>
                <div style={{ color: "#526276", fontSize: 14 }}>
                  {t(locale, "tripReference")}: {trip.reference} ·{" "}
                  {new Date(trip.scheduledAt).toLocaleString()}
                </div>
                <Link href={`/trips/${trip.id}?lang=${locale}`}>{t(locale, "viewTrip")}</Link>
              </li>
            ))}
          </ul>
        )}
        {token ? (
          <p style={{ margin: 0 }}>
            <Link href={`/support?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
              {t(locale, "tripsSupportLink")}
            </Link>
          </p>
        ) : null}
        {error ? (
          <p role="alert" style={{ color: "#B42318" }}>
            {error}
          </p>
        ) : null}
      </div>
    </SiteChrome>
  );
}
