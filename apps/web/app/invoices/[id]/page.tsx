"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../../components/SiteChrome";
import { API } from "../../../lib/api";
import { t, type Locale } from "../../../lib/i18n";
import { readAccessToken, saveAccessToken } from "../../../lib/session";

type InvoicePayload = {
  mode: string;
  zatcaNote?: string;
  invoice: {
    id: string;
    number: string;
    totalHalalas: number;
    currency: string;
    status: string;
    draftLabel: string;
    bookingId: string;
    issuedAt: string | null;
    lines: { label: string; amountHalalas: number }[];
  };
};

function InvoiceInner() {
  const params = useSearchParams();
  const routeParams = useParams<{ id: string }>();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const id = routeParams.id;

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<InvoicePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      const res = await fetch(`${API}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Failed to load invoice");
        return;
      }
      setData(body);
    })();
  }, [token, id]);

  async function login() {
    setError(null);
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.message ?? "Login failed");
      return;
    }
    saveAccessToken(body.accessToken);
    setToken(body.accessToken);
  }

  return (
    <SiteChrome locale={locale}>
      <div style={{ display: "grid", gap: 18, maxWidth: 640 }}>
        <h1 style={{ margin: 0 }}>{t(locale, "invoiceView")}</h1>
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
        ) : data ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 20,
              boxShadow: "0 12px 36px rgba(11,31,58,0.07)",
              display: "grid",
              gap: 12,
            }}
          >
            <Badge tone="warning">{data.invoice.draftLabel}</Badge>
            <strong style={{ fontSize: 22 }}>{data.invoice.number}</strong>
            <div style={{ color: "#526276" }}>
              {data.invoice.status}
              {data.invoice.issuedAt
                ? ` · ${new Date(data.invoice.issuedAt).toLocaleString()}`
                : ""}
            </div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>
              {(data.invoice.totalHalalas / 100).toFixed(2)} {data.invoice.currency}
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {data.invoice.lines.map((l, i) => (
                <li key={`${l.label}-${i}`}>
                  {l.label}: {(l.amountHalalas / 100).toFixed(2)} {data.invoice.currency}
                </li>
              ))}
            </ul>
            {data.zatcaNote ? (
              <p style={{ margin: 0, color: "#526276", fontSize: 13 }}>{data.zatcaNote}</p>
            ) : null}
            <Link href={`/trips/${data.invoice.bookingId}?lang=${locale}`}>
              <Button type="button" variant="secondary">
                {t(locale, "viewTrip")}
              </Button>
            </Link>
          </div>
        ) : (
          <p>…</p>
        )}
        {error ? (
          <p role="alert" style={{ color: "#B42318" }}>
            {error}
          </p>
        ) : null}
      </div>
    </SiteChrome>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>…</div>}>
      <InvoiceInner />
    </Suspense>
  );
}
