"use client";

import { useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function AnalyticsPage() {
  const [email, setEmail] = useState("admin@haramain.local");
  const [password, setPassword] = useState("AdminDev!23456");
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    windowDays?: number;
    events?: { name: string; count: number }[];
    totals?: { bookings: number; notifications: number; openSupportTickets: number };
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body?.message ?? "Login failed");
      return;
    }
    setToken(body.accessToken);
    await refresh(body.accessToken);
  }

  async function refresh(access: string) {
    const res = await fetch(`${API}/admin/analytics/summary`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    setSummary(await res.json());
  }

  async function trackDemo() {
    await fetch(`${API}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "admin.analytics.view",
        props: { milestone: "m7" },
        source: "admin",
      }),
    });
    if (token) await refresh(token);
    setMessage("Recorded admin.analytics.view (local analytics hook)");
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1>Analytics sign in</h1>
        <p style={{ color: "#526276" }}>Basic event hooks — not a marketing attribution stack.</p>
        <form onSubmit={login} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {message ? <p style={{ color: "#B42318" }}>{message}</p> : null}
          <Button type="submit">Sign in</Button>
        </form>
      </div>
    );
  }

  return (
    <AdminShell
      userLabel={email}
      navItems={[
        { href: "/", label: "Overview" },
        { href: "/compliance", label: "Compliance" },
        { href: "/finance", label: "Finance" },
        { href: "/support", label: "Support" },
        { href: "/notifications", label: "Notifications" },
        { href: "/analytics", label: "Analytics", active: true },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Analytics hooks</h1>
        <p style={{ margin: 0, color: "#526276" }}>
          M7 — last {summary?.windowDays ?? 7} days of named events + ops totals.
        </p>
        <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone="success">bookings {summary?.totals?.bookings ?? 0}</Badge>
            <Badge tone="success">notifications {summary?.totals?.notifications ?? 0}</Badge>
            <Badge tone="warning">open tickets {summary?.totals?.openSupportTickets ?? 0}</Badge>
            <Button type="button" onClick={() => void trackDemo()}>
              Record view event
            </Button>
          </div>
          {message ? <p style={{ color: "#087F6D" }}>{message}</p> : null}
          <strong>Top events</strong>
          <ul>
            {(summary?.events ?? []).map((e) => (
              <li key={e.name}>
                {e.name}: {e.count}
              </li>
            ))}
            {(summary?.events ?? []).length === 0 ? <li>No events yet</li> : null}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
