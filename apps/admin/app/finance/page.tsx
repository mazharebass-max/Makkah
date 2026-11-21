"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Badge, Button, Input } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson, errMessage } from "../../lib/api";

const SEED_PROVIDER = "00000000-0000-4000-8000-000000000020";

export default function FinancePage() {
  return (
    <AdminGate
      active="finance"
      title="Finance sign in"
      hint="Sandbox ledger + settlement statements only — never live gateway or bank payout claims."
      defaultEmail="finance@haramain.local"
      defaultPassword="FinanceDev!2345"
    >
      {({ token, setMessage }) => <FinanceBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function FinanceBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [recon, setRecon] = useState<Record<string, unknown> | null>(null);
  const [invoices, setInvoices] = useState<unknown[]>([]);
  const [commissions, setCommissions] = useState<unknown[]>([]);
  const [settlements, setSettlements] = useState<
    { id: string; statementNumber: string; totalHalalas: number; status: string; livePayout: boolean }[]
  >([]);
  const [payables, setPayables] = useState<unknown[]>([]);
  const [providerId, setProviderId] = useState(SEED_PROVIDER);

  const refresh = useCallback(async () => {
    const [r, i, c, s, p] = await Promise.all([
      apiJson<Record<string, unknown>>("/admin/finance/reconciliation", { token }),
      apiJson<{ data?: unknown[] }>("/admin/finance/invoices", { token }),
      apiJson<{ data?: unknown[] }>("/admin/finance/commissions", { token }),
      apiJson<{ data?: typeof settlements }>("/admin/finance/settlements", { token }),
      apiJson<{ data?: unknown[] }>("/admin/finance/payables", { token }),
    ]);
    if (r.ok) setRecon(r.body);
    if (i.ok) setInvoices(i.body.data ?? []);
    if (c.ok) setCommissions(c.body.data ?? []);
    if (s.ok) setSettlements(s.body.data ?? []);
    if (p.ok) setPayables(p.body.data ?? []);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generateSettlement() {
    const { ok, body } = await apiJson("/admin/finance/settlements/generate", {
      method: "POST",
      token,
      body: JSON.stringify({ providerId }),
    });
    if (!ok) {
      setMessage(errMessage(body, "Generate settlement failed"));
      return;
    }
    setMessage("Sandbox settlement generated");
    await refresh();
  }

  async function markPaid(id: string) {
    const { ok, body } = await apiJson(`/admin/finance/settlements/${id}/mark-sandbox-paid`, {
      method: "POST",
      token,
    });
    if (!ok) {
      setMessage(errMessage(body, "Mark paid failed"));
      return;
    }
    setMessage(`Settlement ${id.slice(0, 8)}… marked sandbox-paid (not a bank payout)`);
    await refresh();
  }

  const totals = (recon?.totals ?? {}) as Record<string, number>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Finance reconciliation</h1>
      <p style={{ margin: 0, color: "#526276" }}>
        F4 — sandbox commissions, payables &amp; settlement statements. liveGateway=
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
      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 10 }}>
        <strong>Payables (sandbox)</strong>
        <ul style={{ marginTop: 0 }}>
          {(
            payables as {
              id?: string;
              providerId?: string;
              amountHalalas?: number;
              status?: string;
            }[]
          ).map((p, idx) => (
            <li key={p.id ?? idx}>
              {p.providerId?.slice(0, 8) ?? "provider"} · {p.amountHalalas ?? 0} · {p.status}
            </li>
          ))}
          {payables.length === 0 ? <li>No payables yet</li> : null}
        </ul>
      </section>
      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 12 }}>
        <strong>Settlement statements (sandbox only)</strong>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <Input
            label="Provider ID"
            value={providerId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setProviderId(e.target.value)}
          />
          <Button type="button" onClick={() => void generateSettlement()}>
            Generate sandbox settlement
          </Button>
        </div>
        <ul style={{ marginTop: 0, listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {settlements.map((s) => (
            <li
              key={s.id || s.statementNumber}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                borderTop: "1px solid rgba(11,31,58,0.08)",
                paddingTop: 8,
              }}
            >
              <span>
                {s.statementNumber} · {s.totalHalalas} · {s.status} · livePayout=
                {String(s.livePayout)}
              </span>
              {s.status !== "SANDBOX_PAID" && s.id ? (
                <Button type="button" onClick={() => void markPaid(s.id)}>
                  Mark sandbox paid
                </Button>
              ) : null}
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
      <Button type="button" onClick={() => void refresh()}>
        Refresh
      </Button>
    </div>
  );
}
