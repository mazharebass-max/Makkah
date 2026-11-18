"use client";

import { useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function FinancePage() {
  const [email, setEmail] = useState("finance@haramain.local");
  const [password, setPassword] = useState("FinanceDev!2345");
  const [token, setToken] = useState<string | null>(null);
  const [recon, setRecon] = useState<Record<string, unknown> | null>(null);
  const [invoices, setInvoices] = useState<unknown[]>([]);
  const [commissions, setCommissions] = useState<unknown[]>([]);
  const [settlements, setSettlements] = useState<unknown[]>([]);
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
    const [r, i, c, s] = await Promise.all([
      fetch(`${API}/admin/finance/reconciliation`, {
        headers: { Authorization: `Bearer ${access}` },
      }),
      fetch(`${API}/admin/finance/invoices`, {
        headers: { Authorization: `Bearer ${access}` },
      }),
      fetch(`${API}/admin/finance/commissions`, {
        headers: { Authorization: `Bearer ${access}` },
      }),
      fetch(`${API}/admin/finance/settlements`, {
        headers: { Authorization: `Bearer ${access}` },
      }),
    ]);
    setRecon(await r.json());
    const inv = await i.json();
    setInvoices(inv.data ?? []);
    const com = await c.json();
    setCommissions(com.data ?? []);
    const stl = await s.json();
    setSettlements(stl.data ?? []);
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1>Finance sign in</h1>
        <p style={{ color: "#526276" }}>
          Sandbox ledger + settlement statements only — never live gateway or bank payout claims.
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

  const totals = (recon?.totals ?? {}) as Record<string, number>;

  return (
    <AdminShell
      userLabel={email}
      navItems={[
        { href: "/", label: "Overview" },
        { href: "/compliance", label: "Compliance" },
        { href: "/finance", label: "Finance", active: true },
        { href: "/support", label: "Support" },
        { href: "/notifications", label: "Notifications" },
        { href: "/analytics", label: "Analytics" },
        { href: "/ops", label: "Ops / Gate" },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Finance reconciliation</h1>
        <p style={{ margin: 0, color: "#526276" }}>
          F4 — sandbox commissions &amp; settlement statements. liveGateway=
          {String(recon?.liveGateway ?? false)} · livePayout={String(recon?.livePayout ?? false)}
        </p>
        <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Totals (halalas)</strong>
          <ul>
            <li>Captured: {totals.capturedHalalas ?? 0}</li>
            <li>Refunded: {totals.refundedHalalas ?? 0}</li>
            <li>Net: {totals.netHalalas ?? 0}</li>
            <li>Commissions (draft): {totals.commissionHalalas ?? 0}</li>
            <li>Payables (sandbox): {totals.payableHalalas ?? 0}</li>
            <li>Settlements (sandbox): {totals.settlementHalalas ?? 0}</li>
            <li>Issued invoices: {totals.issuedInvoices ?? 0}</li>
          </ul>
          <Badge tone="warning">{String(recon?.message ?? "sandbox")}</Badge>
        </section>
        <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Commissions (sandbox)</strong>
          <ul style={{ marginTop: 12 }}>
            {(
              commissions as {
                bookingReference: string;
                amountHalalas: number;
                rateBps: number;
                status: string;
              }[]
            ).map((c) => (
              <li key={`${c.bookingReference}-${c.amountHalalas}`}>
                {c.bookingReference} · {c.amountHalalas} · {c.rateBps}bps · {c.status}
              </li>
            ))}
            {commissions.length === 0 ? <li>No commissions yet</li> : null}
          </ul>
        </section>
        <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Settlement statements (sandbox only)</strong>
          <ul style={{ marginTop: 12 }}>
            {(
              settlements as {
                statementNumber: string;
                totalHalalas: number;
                status: string;
                livePayout: boolean;
              }[]
            ).map((s) => (
              <li key={s.statementNumber}>
                {s.statementNumber} · {s.totalHalalas} · {s.status} · livePayout=
                {String(s.livePayout)}
              </li>
            ))}
            {settlements.length === 0 ? <li>No settlements yet</li> : null}
          </ul>
        </section>
        <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Invoices</strong>
          <ul style={{ marginTop: 12 }}>
            {(invoices as { number: string; totalHalalas: number; status: string }[]).map((inv) => (
              <li key={inv.number}>
                {inv.number} · {inv.totalHalalas} · {inv.status}
              </li>
            ))}
            {invoices.length === 0 ? <li>No invoices yet</li> : null}
          </ul>
        </section>
        <Button type="button" onClick={() => token && void refresh(token)}>
          Refresh
        </Button>
      </div>
    </AdminShell>
  );
}
