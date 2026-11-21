"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
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

const NON_CANCELLABLE = new Set([
  "CANCELLED",
  "CANCEL_REQUESTED",
  "COMPLETED",
  "NO_SHOW",
]);

function TripDetailInner() {
  const params = useSearchParams();
  const routeParams = useParams<{ id: string }>();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const id = routeParams.id;

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("customer@haramain.local");
  const [password, setPassword] = useState("CustomerDev!234");
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadTrip = useCallback(
    async (access: string) => {
      const res = await fetch(`${API}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Failed to load trip");
        return;
      }
      setTrip(body);
    },
    [id],
  );

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  useEffect(() => {
    if (!token || !id) return;
    void loadTrip(token);
  }, [token, id, loadTrip]);

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

  async function cancelTrip() {
    if (!token || !trip) return;
    if (!window.confirm(t(locale, "cancelTripConfirm"))) return;
    setCancelling(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`${API}/bookings/${trip.id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cancelNote.trim() ? { note: cancelNote.trim() } : {}),
    });
    const body = await res.json();
    setCancelling(false);
    if (!res.ok) {
      setError(body?.message?.message ?? body?.message ?? "Cancel failed");
      return;
    }
    setMessage(t(locale, "cancelTripDone"));
    setTrip(body);
  }

  const canCancel = trip && !NON_CANCELLABLE.has(trip.status);

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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <Link href={`/support?lang=${locale}&bookingId=${trip.id}`}>
                <Button type="button" variant="secondary">
                  {t(locale, "getSupport")}
                </Button>
              </Link>
            </div>

            {canCancel ? (
              <div
                style={{
                  borderTop: "1px solid rgba(11,31,58,0.1)",
                  paddingTop: 14,
                  display: "grid",
                  gap: 10,
                }}
              >
                <Input
                  label={t(locale, "cancelTripNote")}
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={cancelling}
                  onClick={() => void cancelTrip()}
                >
                  {t(locale, "cancelTrip")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <p>…</p>
        )}
        {message ? <p style={{ color: "#087F6D", margin: 0 }}>{message}</p> : null}
        {error ? (
          <p role="alert" style={{ color: "#B42318" }}>
            {error}
          </p>
        ) : null}
      </div>
    </SiteChrome>
  );
}

export default function TripDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>…</div>}>
      <TripDetailInner />
    </Suspense>
  );
}
