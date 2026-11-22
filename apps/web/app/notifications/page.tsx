"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { API } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { readAccessToken, saveAccessToken } from "../../lib/session";

type Notif = {
  id: string;
  templateCode: string;
  channel: string;
  subject: string | null;
  status: string;
  bookingId: string | null;
  createdAt: string;
  liveDelivery: boolean;
};

function NotificationsInner() {
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Notif[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body?.message ?? "Failed to load notifications");
        return;
      }
      setRows(body.data ?? []);
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
        <Badge tone="warning">{t(locale, "pilot")}</Badge>
        <h1 style={{ margin: 0 }}>{t(locale, "notificationsTitle")}</h1>
        <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>
          {t(locale, "notificationsHint")}
        </p>

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
        ) : loading ? (
          <p>…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#526276" }}>{t(locale, "notificationsEmpty")}</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 0 }}>
            {rows.map((n) => (
              <li
                key={n.id}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid rgba(11,31,58,0.08)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{n.subject || n.templateCode}</strong>
                  <Badge>{n.status}</Badge>
                </div>
                <div style={{ color: "#526276", fontSize: 13 }}>
                  {n.channel} · {new Date(n.createdAt).toLocaleString()} · liveDelivery=
                  {String(n.liveDelivery)}
                </div>
                {n.bookingId ? (
                  <Link
                    href={`/trips/${n.bookingId}?lang=${locale}`}
                    style={{ color: "#1A5FBF", fontWeight: 600, fontSize: 14 }}
                  >
                    {t(locale, "notificationsOpenTrip")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p role="alert" style={{ color: "#B42318" }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={`/trips?lang=${locale}`}>
            <Button type="button" variant="secondary">
              {t(locale, "myTrips")}
            </Button>
          </Link>
          <Link href={`/support?lang=${locale}`}>
            <Button type="button" variant="secondary">
              {t(locale, "supportNav")}
            </Button>
          </Link>
        </div>
      </div>
    </SiteChrome>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>…</div>}>
      <NotificationsInner />
    </Suspense>
  );
}
