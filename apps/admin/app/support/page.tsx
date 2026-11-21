"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Badge, Button, Input } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson, errMessage } from "../../lib/api";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  bookingId?: string | null;
  messageCount?: number;
  updatedAt: string;
};

export default function SupportPage() {
  return (
    <AdminGate
      active="support"
      title="Support sign in"
      hint="Inbox for sandbox tickets — no live channel claims."
      defaultEmail="support@haramain.local"
      defaultPassword="SupportDev!2345"
    >
      {({ token, setMessage }) => <SupportBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function SupportBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<{
    id: string;
    subject: string;
    status: string;
    messages: { id: string; body: string; authorEmail: string; createdAt: string }[];
  } | null>(null);
  const [reply, setReply] = useState("");

  const refresh = useCallback(async () => {
    const { ok, body } = await apiJson<{ data?: Ticket[] }>("/support/tickets", { token });
    if (ok) setTickets(body.data ?? []);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openTicket(id: string) {
    const { body } = await apiJson<{
      id: string;
      subject: string;
      status: string;
      messages: { id: string; body: string; authorEmail: string; createdAt: string }[];
    }>(`/support/tickets/${id}`, { token });
    setSelected(body);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    const { ok, body } = await apiJson(`/support/tickets/${selected.id}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ body: reply }),
    });
    if (!ok) {
      setMessage(errMessage(body, "Reply failed"));
      return;
    }
    setReply("");
    await openTicket(selected.id);
    await refresh();
  }

  async function setStatus(status: string) {
    if (!selected) return;
    await apiJson(`/admin/support/tickets/${selected.id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    });
    await openTicket(selected.id);
    await refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Support inbox</h1>
      <p style={{ margin: 0, color: "#526276" }}>
        Tickets + replies. Notifications stay sandbox-only.
      </p>
      <div
        className="hr-support-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}
      >
        <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          <strong>Tickets</strong>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 8 }}>
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => void openTicket(t.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid rgba(11,31,58,0.1)",
                    borderRadius: 12,
                    padding: 12,
                    background: selected?.id === t.id ? "#F3F7FB" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <strong>{t.subject}</strong> · {t.status}
                  </div>
                  <div style={{ color: "#526276", fontSize: 13 }}>
                    {t.messageCount ?? 0} msgs · {new Date(t.updatedAt).toLocaleString()}
                  </div>
                </button>
              </li>
            ))}
            {tickets.length === 0 ? <li>No tickets yet</li> : null}
          </ul>
        </section>
        <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
          {selected ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{selected.subject}</strong>
                <Badge tone="warning">{selected.status}</Badge>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button type="button" onClick={() => void setStatus("PENDING")}>
                  Pending
                </Button>
                <Button type="button" onClick={() => void setStatus("RESOLVED")}>
                  Resolve
                </Button>
                <Button type="button" onClick={() => void setStatus("CLOSED")}>
                  Close
                </Button>
              </div>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
                {selected.messages.map((m) => (
                  <li
                    key={m.id}
                    style={{ borderTop: "1px solid rgba(11,31,58,0.08)", paddingTop: 8 }}
                  >
                    <div style={{ fontSize: 13, color: "#526276" }}>
                      {m.authorEmail} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div>{m.body}</div>
                  </li>
                ))}
              </ul>
              <Input label="Reply" value={reply} onChange={(e: ChangeEvent<HTMLInputElement>) => setReply(e.target.value)} />
              <Button type="button" onClick={() => void sendReply()}>
                Send reply
              </Button>
            </div>
          ) : (
            <p style={{ color: "#526276" }}>Select a ticket</p>
          )}
        </section>
      </div>
      <style>{`
        @media (max-width: 800px) {
          .hr-support-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
