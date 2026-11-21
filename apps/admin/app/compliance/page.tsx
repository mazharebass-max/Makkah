"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Badge, Button, Input } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson, errMessage } from "../../lib/api";

type QueueRow = {
  id: string;
  legalName: string;
  status: string;
  documentCount: number;
  expiredDocs: number;
  updatedAt: string;
};

export default function CompliancePage() {
  return (
    <AdminGate
      active="compliance"
      title="Compliance sign in"
      hint="Human verification workbench — never auto-approves."
      defaultEmail="compliance@haramain.local"
      defaultPassword="ComplianceDev!2"
    >
      {({ token, setMessage }) => <ComplianceBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function ComplianceBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("Human review note — sandbox evidence only");

  const loadQueue = useCallback(async () => {
    const { ok, body } = await apiJson<{ data?: QueueRow[] }>("/admin/compliance/providers", {
      token,
    });
    if (ok) setRows(body.data ?? []);
  }, [token]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function openDetail(id: string) {
    setSelected(id);
    const { body } = await apiJson<Record<string, unknown>>(`/admin/compliance/providers/${id}`, {
      token,
    });
    setDetail(body);
  }

  async function review(toStatus: string) {
    if (!selected) return;
    const { ok, body } = await apiJson(`/admin/compliance/providers/${selected}/review`, {
      method: "POST",
      token,
      body: JSON.stringify({ toStatus, note }),
    });
    setMessage(ok ? `Reviewed → ${toStatus}` : errMessage(body, `HTTP error`));
    await loadQueue();
    await openDetail(selected);
  }

  async function expireDocs() {
    const { ok, body } = await apiJson<{ message?: string; expiredCount?: number }>(
      "/admin/compliance/expire-documents",
      { method: "POST", token },
    );
    setMessage(
      ok
        ? (body.message ?? `Expired ${body.expiredCount ?? 0}`)
        : errMessage(body, "Expire failed"),
    );
    await loadQueue();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Provider compliance</h1>
      <p style={{ margin: 0, color: "#526276" }}>
        Review queue, document expiry, suspension. No fabricated licence approvals.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button type="button" onClick={() => void expireDocs()}>
          Mark expired documents
        </Button>
        <Button type="button" onClick={() => void loadQueue()}>
          Refresh
        </Button>
      </div>

      <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
        <strong>Queue</strong>
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                borderTop: "1px solid rgba(11,31,58,0.08)",
                paddingTop: 8,
              }}
            >
              <div>
                <div>
                  <strong>{r.legalName}</strong> · {r.status}
                </div>
                <div style={{ fontSize: 13, color: "#526276" }}>
                  docs {r.documentCount} · expired {r.expiredDocs}
                </div>
              </div>
              <Button type="button" onClick={() => void openDetail(r.id)}>
                Open
              </Button>
            </li>
          ))}
          {rows.length === 0 ? <li>No providers in queue</li> : null}
        </ul>
      </section>

      {detail ? (
        <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Review detail</strong>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              background: "#F4F7FB",
              padding: 12,
              borderRadius: 8,
              maxHeight: 280,
              overflow: "auto",
            }}
          >
            {JSON.stringify(detail, null, 2)}
          </pre>
          <Input label="Review note" value={note} onChange={(e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <Button type="button" onClick={() => void review("IN_REVIEW")}>
              Mark in review
            </Button>
            <Button type="button" onClick={() => void review("NEEDS_INFORMATION")}>
              Needs information
            </Button>
            <Button type="button" onClick={() => void review("APPROVED")}>
              Approve (human)
            </Button>
            <Button type="button" onClick={() => void review("REJECTED")}>
              Reject
            </Button>
            <Button type="button" onClick={() => void review("SUSPENDED")}>
              Suspend
            </Button>
          </div>
        </section>
      ) : null}
      <Badge tone="warning">DRAFT — OWNER APPROVAL REQUIRED for live ops</Badge>
    </div>
  );
}
