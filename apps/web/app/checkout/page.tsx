"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { API, type PickupPointRow } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { readAccessToken, saveAccessToken } from "../../lib/session";

type Quote = {
  id: string;
  expired: boolean;
  totalHalalas: number;
  currency: string;
  scheduledAt: string;
  route: { nameEn: string; nameAr?: string | null; code: string };
  category: { nameEn: string; nameAr?: string | null; code: string };
  lines: { label: string; amountHalalas: number }[];
  cancellationPolicy: { summaryEn: string; summaryAr: string; draftLabel: string };
};

export default function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const quoteId = params.get("quoteId") ?? "";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+966");
  const [flightNumber, setFlightNumber] = useState("");
  const [pickupPointCode, setPickupPointCode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [pickupPoints, setPickupPoints] = useState<PickupPointRow[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  useEffect(() => {
    if (!quoteId) return;
    void (async () => {
      const res = await fetch(`${API}/quotes/${quoteId}`);
      const body = await res.json();
      if (res.ok) setQuote(body);
      else setError(body?.message ?? "Quote not found");
    })();
  }, [quoteId]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API}/pickup-points`);
        const body = await res.json();
        if (res.ok) setPickupPoints(body.data ?? []);
      } catch {
        setPickupPoints([]);
      }
    })();
  }, []);

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
    setMessage(`Signed in as ${body.user.email}`);
  }

  async function placeBooking() {
    if (!token || !quote) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const booked = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quoteId: quote.id,
          contactName: name,
          contactPhone: phone,
          acceptTerms: accepted,
          idempotencyKey: `web-${quote.id}`,
          ...(flightNumber.trim() ? { flightNumber: flightNumber.trim() } : {}),
          ...(pickupPointCode ? { pickupPointCode } : {}),
          ...(specialInstructions.trim()
            ? { specialInstructions: specialInstructions.trim() }
            : {}),
        }),
      });
      const body = await booked.json();
      if (!booked.ok) {
        setError(body?.message?.message ?? body?.message ?? "Booking failed");
        return;
      }

      const bookingId = body.booking.id as string;

      const pay = await fetch(`${API}/payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          idempotencyKey: `web-pay-${bookingId}`,
        }),
      });
      const payBody = await pay.json();
      if (!pay.ok) {
        setError(payBody?.message ?? "Sandbox checkout failed");
        return;
      }

      const complete = await fetch(`${API}/payments/sandbox/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      const completeBody = await complete.json();
      if (!complete.ok) {
        setError(completeBody?.message ?? "Sandbox complete failed");
        return;
      }

      router.push(
        `/confirmation?lang=${locale}&bookingId=${encodeURIComponent(bookingId)}&ref=${encodeURIComponent(body.booking.reference)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome locale={locale}>
      <div style={{ display: "grid", gap: 20, maxWidth: 640 }}>
        <h1 style={{ margin: 0 }}>{t(locale, "checkout")}</h1>
        {!quote ? <p>{error ?? "…"}</p> : null}
        {quote ? (
          <>
            <Badge tone="warning">{quote.cancellationPolicy.draftLabel}</Badge>
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 18,
                boxShadow: "0 12px 36px rgba(11,31,58,0.07)",
              }}
            >
              <strong>
                {locale === "ar" && quote.route.nameAr
                  ? quote.route.nameAr
                  : quote.route.nameEn}
              </strong>
              <div style={{ color: "#526276" }}>
                {locale === "ar" && quote.category.nameAr
                  ? quote.category.nameAr
                  : quote.category.nameEn}{" "}
                · {new Date(quote.scheduledAt).toLocaleString()}
              </div>
              <div style={{ marginTop: 10, fontWeight: 800, fontSize: 22 }}>
                {(quote.totalHalalas / 100).toFixed(2)} {quote.currency}
              </div>
              <ul>
                {quote.lines.map((l) => (
                  <li key={l.label}>
                    {l.label}: {(l.amountHalalas / 100).toFixed(2)} {quote.currency}
                  </li>
                ))}
              </ul>
              <p style={{ color: "#526276" }}>
                <strong>{t(locale, "cancellation")}:</strong>{" "}
                {locale === "ar"
                  ? quote.cancellationPolicy.summaryAr
                  : quote.cancellationPolicy.summaryEn}
              </p>
              {quote.expired ? (
                <p role="alert" style={{ color: "#B42318" }}>
                  Quote expired
                </p>
              ) : null}
            </div>

            {!token ? (
              <section style={{ display: "grid", gap: 12 }}>
                <h2 style={{ margin: 0 }}>{t(locale, "signIn")}</h2>
                <Input
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <Button type="button" onClick={() => void login()}>
                  {t(locale, "signIn")}
                </Button>
              </section>
            ) : (
              <section style={{ display: "grid", gap: 12 }}>
                <h2 style={{ margin: 0 }}>{t(locale, "contact")}</h2>
                <Input
                  label={t(locale, "name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label={t(locale, "phone")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label={t(locale, "flightNumber")}
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  placeholder="SV123"
                />
                <p style={{ margin: 0, color: "#526276", fontSize: 13 }}>
                  {t(locale, "flightNumberHint")}
                </p>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t(locale, "pickupPoint")}</span>
                  <select
                    value={pickupPointCode}
                    onChange={(e) => setPickupPointCode(e.target.value)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(11,31,58,0.15)",
                      fontSize: 15,
                      background: "#fff",
                    }}
                  >
                    <option value="">{t(locale, "pickupPointNone")}</option>
                    {pickupPoints.map((p) => (
                      <option key={p.code} value={p.code}>
                        {locale === "ar" && p.nameAr ? p.nameAr : p.nameEn} ({p.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {t(locale, "specialInstructions")}
                  </span>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={3}
                    maxLength={500}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(11,31,58,0.15)",
                      fontSize: 15,
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                  <span style={{ color: "#526276", fontSize: 13 }}>
                    {t(locale, "specialInstructionsHint")}
                  </span>
                </label>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    style={{ width: 20, height: 20, marginTop: 2 }}
                  />
                  <span>
                    {t(locale, "acceptTerms")} (
                    <a href={`/legal/terms?lang=${locale}`}>{t(locale, "terms")}</a>,{" "}
                    <a href={`/legal/cancellation?lang=${locale}`}>{t(locale, "cancelPolicy")}</a>)
                  </span>
                </label>
                <Button
                  type="button"
                  disabled={!accepted || quote.expired || busy || !name.trim() || phone.length < 7}
                  onClick={() => void placeBooking()}
                >
                  {t(locale, "paySandbox")}
                </Button>
                <Badge tone="warning">{t(locale, "sandboxOnly")}</Badge>
              </section>
            )}
          </>
        ) : null}
        {error ? (
          <p role="alert" style={{ color: "#B42318", whiteSpace: "pre-wrap" }}>
            {error}
          </p>
        ) : null}
        {message ? (
          <p style={{ color: "#087F6D", whiteSpace: "pre-wrap" }}>{message}</p>
        ) : null}
      </div>
    </SiteChrome>
  );
}
