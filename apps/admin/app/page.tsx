"use client";

import { useEffect, useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Me = { email: string; roles: string[] };

export default function AdminHome() {
  const [email, setEmail] = useState("admin@haramain.local");
  const [password, setPassword] = useState("AdminDev!23456");
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [anonBlocked, setAnonBlocked] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API}/admin/bookings`);
        setAnonBlocked(
          res.status === 401
            ? "Unauthenticated admin blocked (401)"
            : `Unexpected ${res.status}`,
        );
      } catch {
        setAnonBlocked("Could not reach API for anon check (is API running?)");
      }
    })();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) {
      setBookingsError(body?.message ?? "Login failed");
      return;
    }
    setToken(body.accessToken);
    setMe(body.user);
    const bookings = await fetch(`${API}/admin/bookings`, {
      headers: { Authorization: `Bearer ${body.accessToken}` },
    });
    if (!bookings.ok) {
      setBookingsError(`Bookings forbidden/error: ${bookings.status}`);
      setBookingCount(null);
      return;
    }
    const data = await bookings.json();
    setBookingsError(null);
    setBookingCount(Array.isArray(data.data) ? data.data.length : 0);
  }

  if (!token || !me) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1 style={{ fontSize: 28 }}>Admin sign in</h1>
        <p style={{ color: "#526276" }}>No unauthenticated admin routes. MFA lands before production.</p>
        {anonBlocked ? <Badge tone="success">{anonBlocked}</Badge> : null}
        <form onSubmit={login} style={{ display: "grid", gap: 14, marginTop: 20 }}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {bookingsError ? <p style={{ color: "#B42318" }}>{bookingsError}</p> : null}
          <Button type="submit">Sign in</Button>
        </form>
      </div>
    );
  }

  return (
    <AdminShell
      userLabel={`${me.email} · ${me.roles.join(", ")}`}
      navItems={[
        { href: "/#overview", label: "Overview", active: true },
        { href: "/#bookings", label: "Bookings" },
        { href: "/#providers", label: "Providers" },
        { href: "/#finance", label: "Finance" },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Operations overview</h1>
        <p style={{ color: "#526276", margin: 0 }}>
          M1 shell — RBAC enforced via API. Hybrid fleet verification is human-gated (M4).
        </p>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 24px rgba(11,31,58,0.06)",
          }}
        >
          <strong>Bookings visible to your role</strong>
          <div style={{ marginTop: 8 }}>{bookingCount ?? "—"} rows (seed may be empty)</div>
          {bookingsError ? <div style={{ color: "#B42318" }}>{bookingsError}</div> : null}
        </div>
        <Badge tone="warning">DRAFT — OWNER APPROVAL REQUIRED for live ops</Badge>
      </div>
    </AdminShell>
  );
}
