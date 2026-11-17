"use client";

import { useEffect, useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Me = { email: string; roles: string[] };
type BookingRow = {
  id: string;
  reference: string;
  status: string;
  scheduledAt: string;
  route?: { code: string };
};
type VehicleRow = {
  id: string;
  plateNumber: string;
  makeModel: string;
  active: boolean;
  category?: { code: string } | null;
};

export default function AdminHome() {
  const [email, setEmail] = useState("dispatcher@haramain.local");
  const [password, setPassword] = useState("DispatchDev!234");
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
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
        setAnonBlocked("API unreachable for anon check");
      }
    })();
  }, []);

  async function refresh(access: string) {
    const [bRes, vRes] = await Promise.all([
      fetch(`${API}/admin/bookings`, { headers: { Authorization: `Bearer ${access}` } }),
      fetch(`${API}/admin/fleet/vehicles`, { headers: { Authorization: `Bearer ${access}` } }),
    ]);
    if (bRes.ok) {
      const data = await bRes.json();
      setBookings(data.data ?? []);
      setBookingsError(null);
    } else {
      setBookingsError(`Bookings: ${bRes.status}`);
    }
    if (vRes.ok) {
      const data = await vRes.json();
      setVehicles(data.data ?? []);
    }
  }

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
    await refresh(body.accessToken);
  }

  async function assign(bookingId: string) {
    if (!token) return;
    setMessage(null);
    const res = await fetch(`${API}/admin/bookings/${bookingId}/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Admin console assign" }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body?.message?.message ?? body?.message ?? `Assign failed ${res.status}`);
      return;
    }
    setMessage(`Assigned ${bookingId.slice(0, 8)}… → ${body.status} / vehicle ${body.assignment?.vehicleId?.slice(0, 8)}`);
    await refresh(token);
  }

  if (!token || !me) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1 style={{ fontSize: 28 }}>Admin sign in</h1>
        <p style={{ color: "#526276" }}>
          No unauthenticated admin routes. Use dispatcher or fleet manager for M3 ops.
        </p>
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
        { href: "/#fleet", label: "Owned fleet" },
        { href: "/compliance", label: "Compliance" },
        { href: "/finance", label: "Finance" },
        { href: "/support", label: "Support" },
        { href: "/notifications", label: "Notifications" },
        { href: "/analytics", label: "Analytics" },
        { href: "/ops", label: "Ops / Gate" },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Dispatch & owned fleet</h1>
        <p style={{ color: "#526276", margin: 0 }}>
          M3 — concurrency-safe assign, availability holds, sandbox payment confirm only.
        </p>
        {message ? <p style={{ color: "#087F6D" }}>{message}</p> : null}

        <section id="bookings" style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Bookings</strong>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 10 }}>
            {bookings.length === 0 ? <li>No bookings yet</li> : null}
            {bookings.map((b) => (
              <li
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                  borderTop: "1px solid rgba(11,31,58,0.08)",
                  paddingTop: 10,
                }}
              >
                <div>
                  <div>
                    <strong>{b.reference}</strong> · {b.status}
                  </div>
                  <div style={{ color: "#526276", fontSize: 13 }}>
                    {b.route?.code} · {new Date(b.scheduledAt).toLocaleString()}
                  </div>
                </div>
                {(b.status === "ASSIGNMENT_PENDING" ||
                  b.status === "CONFIRMED" ||
                  b.status === "ASSIGNED") && (
                  <Button type="button" onClick={() => void assign(b.id)}>
                    Assign vehicle
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {bookingsError ? <div style={{ color: "#B42318" }}>{bookingsError}</div> : null}
        </section>

        <section id="fleet" style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Owned fleet (DB inventory)</strong>
          <ul style={{ marginTop: 12, paddingInlineStart: 18 }}>
            {vehicles.map((v) => (
              <li key={v.id}>
                {v.plateNumber} · {v.makeModel} · {v.category?.code ?? "—"} ·{" "}
                {v.active ? "active" : "inactive"}
              </li>
            ))}
          </ul>
        </section>
        <Badge tone="warning">DRAFT — OWNER APPROVAL REQUIRED for live ops</Badge>
      </div>
    </AdminShell>
  );
}
