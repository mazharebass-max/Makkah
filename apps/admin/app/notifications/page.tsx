"use client";

import { useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function NotificationsPage() {
  const [email, setEmail] = useState("support@haramain.local");
  const [password, setPassword] = useState("SupportDev!2345");
  const [token, setToken] = useState<string | null>(null);
  const [queue, setQueue] = useState<{
    pendingOutbox?: number;
    recent?: { id: string; templateCode: string; status: string; toAddress: string; createdAt: string }[];
    liveDelivery?: boolean;
    mode?: string;
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
    const res = await fetch(`${API}/admin/notifications/queue`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    setQueue(await res.json());
  }

  async function processOutbox() {
    if (!token) return;
    const res = await fetch(`${API}/admin/notifications/process-outbox`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    setMessage(
      `Processed ${body.processed ?? 0} · sent ${body.sent ?? 0} · remaining ${body.remaining ?? 0} (sandbox)`,
    );
    await refresh(token);
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1>Notifications sign in</h1>
        <p style={{ color: "#526276" }}>Outbox drain is sandbox-only — never live SMS/email.</p>
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
        { href: "/notifications", label: "Notifications", active: true },
        { href: "/analytics", label: "Analytics" },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Notification outbox</h1>
        <p style={{ margin: 0, color: "#526276" }}>
          M7 — transactional queue via OutboxEvent → sandbox email/SMS adapters.
        </p>
        <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone="warning">pending outbox: {queue?.pendingOutbox ?? 0}</Badge>
            <Badge tone="success">liveDelivery={String(queue?.liveDelivery ?? false)}</Badge>
            <Button type="button" onClick={() => void processOutbox()}>
              Process outbox
            </Button>
          </div>
          {message ? <p style={{ color: "#087F6D" }}>{message}</p> : null}
          <strong>Recent sandbox sends</strong>
          <ul style={{ marginTop: 4 }}>
            {(queue?.recent ?? []).map((n) => (
              <li key={n.id}>
                {n.templateCode} · {n.status} · {n.toAddress} ·{" "}
                {new Date(n.createdAt).toLocaleString()}
              </li>
            ))}
            {(queue?.recent ?? []).length === 0 ? <li>No notifications yet</li> : null}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
