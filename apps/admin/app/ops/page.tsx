"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson } from "../../lib/api";

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
  items?: {
    id: string;
    category: string;
    title: string;
    status: string;
    signedOff: boolean;
    notes: string;
  }[];
};

type Security = {
  message?: string;
  productionHardened?: boolean;
  penTestComplete?: boolean;
  controls?: { id: string; title: string; status: string }[];
};

export default function OpsPage() {
  return (
    <AdminGate
      active="ops"
      title="Ops / staging sign in"
      hint="Hardening dashboard — never claims regulatory clearance or go-live."
      defaultEmail="admin@haramain.local"
      defaultPassword="AdminDev!23456"
    >
      {({ token }) => <OpsBody token={token} />}
    </AdminGate>
  );
}

function OpsBody({ token }: { token: string }) {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [security, setSecurity] = useState<Security | null>(null);

  const refresh = useCallback(async () => {
    const [r, g, s] = await Promise.all([
      apiJson<Readiness>("/ops/readiness"),
      apiJson<Gate>("/admin/ops/compliance-gate", { token }),
      apiJson<Security>("/admin/ops/security-checklist", { token }),
    ]);
    setReadiness(r.body);
    setGate(g.body);
    setSecurity(s.body);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Staging hardening & compliance gate</h1>
      <p style={{ margin: 0, color: "#526276" }}>
        Operational readiness checklist. Regulatory clearance and production go-live stay{" "}
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
        <strong>
          Compliance gate ({gate?.signedOffCount ?? 0}/{gate?.total ?? 0} signed)
        </strong>
        <p style={{ margin: 0, color: "#526276" }}>{gate?.message}</p>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {(gate?.items ?? []).map((item) => (
            <li key={item.id} style={{ borderTop: "1px solid rgba(11,31,58,0.08)", paddingTop: 8 }}>
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
        <Button type="button" onClick={() => void refresh()}>
          Refresh
        </Button>
      </section>
    </div>
  );
}
