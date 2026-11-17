"use client";

import { useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Readiness = {
  stagingReady?: boolean;
  productionGoLive?: boolean;
  regulatoryClearance?: boolean;
  liveOps?: boolean;
  message?: string;
  checks?: Record<string, unknown>;
  proposedSlo?: { rpoHours: number; rtoHours: number; label: string };
};

type Gate = {
  message?: string;
  regulatoryClearance?: boolean;
  productionGoLive?: boolean;
  signedOffCount?: number;
  total?: number;
  items?: { id: string; category: string; title: string; status: string; signedOff: boolean; notes: string }[];
};

type Security = {
  message?: string;
  productionHardened?: boolean;
  penTestComplete?: boolean;
  controls?: { id: string; title: string; status: string }[];
};

export default function OpsPage() {
  const [email, setEmail] = useState("admin@haramain.local");
  const [password, setPassword] = useState("AdminDev!23456");
  const [token, setToken] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [security, setSecurity] = useState<Security | null>(null);
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
    const [r, g, s] = await Promise.all([
      fetch(`${API}/ops/readiness`),
      fetch(`${API}/admin/ops/compliance-gate`, {
        headers: { Authorization: `Bearer ${access}` },
      }),
      fetch(`${API}/admin/ops/security-checklist`, {
        headers: { Authorization: `Bearer ${access}` },
      }),
    ]);
    setReadiness(await r.json());
    setGate(await g.json());
    setSecurity(await s.json());
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1>Ops / staging sign in</h1>
        <p style={{ color: "#526276" }}>
          M8 hardening dashboard — never claims regulatory clearance or go-live.
        </p>
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
        { href: "/analytics", label: "Analytics" },
        { href: "/ops", label: "Ops / Gate", active: true },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Staging hardening & compliance gate</h1>
        <p style={{ margin: 0, color: "#526276" }}>
          M8 — operational readiness checklist. Regulatory clearance and production go-live stay{" "}
          <strong>false</strong> until owner written sign-offs.
        </p>

        <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 10 }}>
          <strong>Staging readiness</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone={readiness?.stagingReady ? "success" : "warning"}>
              stagingReady={String(readiness?.stagingReady ?? false)}
            </Badge>
            <Badge tone="warning">productionGoLive={String(readiness?.productionGoLive ?? false)}</Badge>
            <Badge tone="warning">
              regulatoryClearance={String(readiness?.regulatoryClearance ?? false)}
            </Badge>
            <Badge tone="warning">liveOps={String(readiness?.liveOps ?? false)}</Badge>
          </div>
          <p style={{ margin: 0, color: "#526276" }}>{readiness?.message}</p>
          <ul style={{ margin: 0 }}>
            {Object.entries(readiness?.checks ?? {}).map(([k, v]) => (
              <li key={k}>
                {k}: {String(v)}
              </li>
            ))}
          </ul>
          {readiness?.proposedSlo ? (
            <Badge tone="warning">
              SLO draft RPO≤{readiness.proposedSlo.rpoHours}h RTO≤{readiness.proposedSlo.rtoHours}h —{" "}
              {readiness.proposedSlo.label}
            </Badge>
          ) : null}
        </section>

        <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 10 }}>
          <strong>Compliance gate ({gate?.signedOffCount ?? 0}/{gate?.total ?? 0} signed)</strong>
          <p style={{ margin: 0, color: "#526276" }}>{gate?.message}</p>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
            {(gate?.items ?? []).map((item) => (
              <li
                key={item.id}
                style={{
                  borderTop: "1px solid rgba(11,31,58,0.08)",
                  paddingTop: 8,
                }}
              >
                <div>
                  <strong>{item.title}</strong> · {item.status}
                </div>
                <div style={{ color: "#526276", fontSize: 13 }}>
                  {item.category} · signedOff={String(item.signedOff)} · {item.notes}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 10 }}>
          <strong>Security checklist</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone="warning">
              productionHardened={String(security?.productionHardened ?? false)}
            </Badge>
            <Badge tone="warning">penTestComplete={String(security?.penTestComplete ?? false)}</Badge>
          </div>
          <p style={{ margin: 0, color: "#526276" }}>{security?.message}</p>
          <ul>
            {(security?.controls ?? []).map((c) => (
              <li key={c.id}>
                {c.title}: {c.status}
              </li>
            ))}
          </ul>
          <Button type="button" onClick={() => token && void refresh(token)}>
            Refresh
          </Button>
        </section>
      </div>
    </AdminShell>
  );
}
