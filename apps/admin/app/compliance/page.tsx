"use client";

import { useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type QueueRow = {
  id: string;
  legalName: string;
  status: string;
  documentCount: number;
  expiredDocs: number;
  updatedAt: string;
};

export default function CompliancePage() {
  const [email, setEmail] = useState("compliance@haramain.local");
  const [password, setPassword] = useState("ComplianceDev!2");
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("Human review note — sandbox evidence only");
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
    await loadQueue(body.accessToken);
  }

  async function loadQueue(access: string) {
    const res = await fetch(`${API}/admin/compliance/providers`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    const body = await res.json();
    if (res.ok) setRows(body.data ?? []);
  }

  async function openDetail(id: string) {
    if (!token) return;
    setSelected(id);
    const res = await fetch(`${API}/admin/compliance/providers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDetail(await res.json());
  }

  async function review(toStatus: string) {
    if (!token || !selected) return;
    const res = await fetch(`${API}/admin/compliance/providers/${selected}/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ toStatus, note }),
    });
    const body = await res.json();
    setMessage(body?.message ?? body?.message?.message ?? `HTTP ${res.status}`);
    await loadQueue(token);
    await openDetail(selected);
  }

  async function expireDocs() {
    if (!token) return;
    const res = await fetch(`${API}/admin/compliance/expire-documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    setMessage(body.message ?? `Expired ${body.expiredCount}`);
    await loadQueue(token);
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1>Compliance sign in</h1>
        <p style={{ color: "#526276" }}>Human verification workbench — never auto-approves.</p>
        <form onSubmit={login} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
        { href: "/compliance", label: "Compliance", active: true },
        { href: "/finance", label: "Finance" },
        { href: "/support", label: "Support" },
        { href: "/notifications", label: "Notifications" },
        { href: "/analytics", label: "Analytics" },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Provider compliance</h1>
        <p style={{ margin: 0, color: "#526276" }}>
          M4 — review queue, document expiry, suspension. No fabricated licence approvals.
        </p>
        {message ? <p style={{ color: "#087F6D" }}>{String(message)}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button type="button" onClick={() => void expireDocs()}>
            Mark expired documents
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
            <Input label="Review note" value={note} onChange={(e) => setNote(e.target.value)} />
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
    </AdminShell>
  );
}
