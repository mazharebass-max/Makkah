"use client";

import { useState } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  bookingId?: string | null;
  messageCount?: number;
  updatedAt: string;
};

export default function SupportPage() {
  const [email, setEmail] = useState("support@haramain.local");
  const [password, setPassword] = useState("SupportDev!2345");
  const [token, setToken] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<{
    id: string;
    subject: string;
    status: string;
    messages: { id: string; body: string; authorEmail: string; createdAt: string }[];
  } | null>(null);
  const [reply, setReply] = useState("");
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
    const res = await fetch(`${API}/support/tickets`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    const body = await res.json();
    setTickets(body.data ?? []);
  }

  async function openTicket(id: string) {
    if (!token) return;
    const res = await fetch(`${API}/support/tickets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSelected(await res.json());
  }

  async function sendReply() {
    if (!token || !selected || !reply.trim()) return;
    const res = await fetch(`${API}/support/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: reply }),
    });
    if (!res.ok) {
      setMessage("Reply failed");
      return;
    }
    setReply("");
    await openTicket(selected.id);
    await refresh(token);
  }

  async function setStatus(status: string) {
    if (!token || !selected) return;
    await fetch(`${API}/admin/support/tickets/${selected.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    await openTicket(selected.id);
    await refresh(token);
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1>Support sign in</h1>
        <p style={{ color: "#526276" }}>Inbox for sandbox tickets — no live channel claims.</p>
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
        { href: "/support", label: "Support", active: true },
        { href: "/notifications", label: "Notifications" },
        { href: "/analytics", label: "Analytics" },
      ]}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Support inbox</h1>
        <p style={{ margin: 0, color: "#526276" }}>
          M7 — tickets + replies. Notifications stay sandbox-only.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
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
                      style={{
                        borderTop: "1px solid rgba(11,31,58,0.08)",
                        paddingTop: 8,
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#526276" }}>
                        {m.authorEmail} · {new Date(m.createdAt).toLocaleString()}
                      </div>
                      <div>{m.body}</div>
                    </li>
                  ))}
                </ul>
                <Input
                  label="Reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <Button type="button" onClick={() => void sendReply()}>
                  Send reply
                </Button>
              </div>
            ) : (
              <p style={{ color: "#526276" }}>Select a ticket</p>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
