"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { API } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { readAccessToken, saveAccessToken } from "../../lib/session";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  bookingId?: string | null;
  messageCount?: number;
  updatedAt: string;
};

type TicketDetail = {
  id: string;
  subject: string;
  status: string;
  bookingId?: string | null;
  messages: { id: string; body: string; authorEmail: string; createdAt: string }[];
};

function SupportInner() {
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const bookingHint = params.get("bookingId") ?? "";

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("customer@haramain.local");
  const [password, setPassword] = useState("CustomerDev!234");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  const refresh = useCallback(async (access: string) => {
    const res = await fetch(`${API}/support/tickets`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.message ?? "Failed to load tickets");
      return;
    }
    setTickets(json.data ?? []);
  }, []);

  useEffect(() => {
    if (!token) return;
    void refresh(token);
  }, [token, refresh]);

  async function login() {
    setError(null);
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.message ?? "Login failed");
      return;
    }
    saveAccessToken(json.accessToken);
    setToken(json.accessToken);
  }

  async function openTicket(id: string) {
    if (!token) return;
    const res = await fetch(`${API}/support/tickets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.message ?? "Could not open ticket");
      return;
    }
    setSelected(json);
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`${API}/support/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject,
        body,
        ...(bookingHint ? { bookingId: bookingHint } : {}),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.message?.message ?? json?.message ?? "Could not create ticket");
      return;
    }
    setSubject("");
    setBody("");
    setMessage(t(locale, "supportCreated"));
    await refresh(token);
    if (json.id) await openTicket(json.id);
  }

  async function sendReply() {
    if (!token || !selected || !reply.trim()) return;
    const res = await fetch(`${API}/support/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body: reply }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json?.message ?? "Reply failed");
      return;
    }
    setReply("");
    await openTicket(selected.id);
    await refresh(token);
  }

  return (
    <SiteChrome locale={locale}>
      <div style={{ display: "grid", gap: 18, maxWidth: 900 }}>
        <h1 style={{ margin: 0 }}>{t(locale, "supportTitle")}</h1>
        <Badge tone="warning">{t(locale, "pilot")}</Badge>
        <p style={{ margin: 0, color: "#526276", lineHeight: 1.55 }}>{t(locale, "supportHint")}</p>

        {!token ? (
          <section style={{ display: "grid", gap: 12, maxWidth: 420 }}>
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="button" onClick={() => void login()}>
              {t(locale, "signIn")}
            </Button>
          </section>
        ) : (
          <div
            className="hr-support-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16 }}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <form
                onSubmit={createTicket}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 18,
                  display: "grid",
                  gap: 12,
                  boxShadow: "0 12px 36px rgba(11,31,58,0.06)",
                }}
              >
                <strong>{t(locale, "supportNew")}</strong>
                {bookingHint ? (
                  <p style={{ margin: 0, fontSize: 13, color: "#526276" }}>
                    {t(locale, "tripReference")}: {bookingHint.slice(0, 8)}…
                  </p>
                ) : null}
                <Input
                  label={t(locale, "supportSubject")}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  minLength={3}
                />
                <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
                  {t(locale, "supportBody")}
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    minLength={3}
                    rows={4}
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(11,31,58,0.16)",
                      padding: 10,
                      font: "inherit",
                    }}
                  />
                </label>
                <Button type="submit">{t(locale, "supportSubmit")}</Button>
              </form>

              <section
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 18,
                  boxShadow: "0 12px 36px rgba(11,31,58,0.06)",
                }}
              >
                <strong>{t(locale, "supportInbox")}</strong>
                <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 8 }}>
                  {tickets.map((ticket) => (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => void openTicket(ticket.id)}
                        style={{
                          width: "100%",
                          textAlign: "start",
                          border: "1px solid rgba(11,31,58,0.1)",
                          borderRadius: 12,
                          padding: 12,
                          background: selected?.id === ticket.id ? "#F3F7FB" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <strong>{ticket.subject}</strong> · {ticket.status}
                        </div>
                        <div style={{ color: "#526276", fontSize: 13 }}>
                          {ticket.messageCount ?? 0} · {new Date(ticket.updatedAt).toLocaleString()}
                        </div>
                      </button>
                    </li>
                  ))}
                  {tickets.length === 0 ? (
                    <li style={{ color: "#526276" }}>{t(locale, "supportEmpty")}</li>
                  ) : null}
                </ul>
              </section>
            </div>

            <section
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 18,
                boxShadow: "0 12px 36px rgba(11,31,58,0.06)",
                minHeight: 280,
              }}
            >
              {selected ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>{selected.subject}</strong>
                    <Badge tone="warning">{selected.status}</Badge>
                  </div>
                  {selected.bookingId ? (
                    <Link href={`/trips/${selected.bookingId}?lang=${locale}`} style={{ color: "#1A5FBF" }}>
                      {t(locale, "viewTrip")}
                    </Link>
                  ) : null}
                  <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10, margin: 0 }}>
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
                  <Input
                    label={t(locale, "supportReply")}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <Button type="button" onClick={() => void sendReply()}>
                    {t(locale, "supportSendReply")}
                  </Button>
                </div>
              ) : (
                <p style={{ color: "#526276", margin: 0 }}>{t(locale, "supportSelect")}</p>
              )}
            </section>
          </div>
        )}

        {message ? <p style={{ color: "#087F6D", margin: 0 }}>{message}</p> : null}
        {error ? (
          <p role="alert" style={{ color: "#B42318", margin: 0 }}>
            {error}
          </p>
        ) : null}
        <p style={{ margin: 0 }}>
          <Link href={`/trips?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
            {t(locale, "myTrips")}
          </Link>
          {" · "}
          <Link href={`/contact?lang=${locale}`} style={{ color: "#1A5FBF", fontWeight: 600 }}>
            {t(locale, "contactNav")}
          </Link>
        </p>
        <style>{`
          @media (max-width: 800px) {
            .hr-support-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </SiteChrome>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>…</div>}>
      <SupportInner />
    </Suspense>
  );
}
