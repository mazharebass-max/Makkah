"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteChrome } from "../../components/SiteChrome";
import { API } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { saveAccessToken } from "../../lib/session";

type Step = "form" | "verify";

const REMEMBER_KEY = "hr_remember_email";

function LockMark() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hr-lock-grad" x1="12" y1="8" x2="60" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8C878" />
          <stop offset="0.55" stopColor="#C6A15B" />
          <stop offset="1" stopColor="#A67C2E" />
        </linearGradient>
      </defs>
      <path
        fill="url(#hr-lock-grad)"
        d="M36 8c-8.3 0-15 6.7-15 15v7h8v-7c0-3.9 3.1-7 7-7s7 3.1 7 7v7h8v-7c0-8.3-6.7-15-15-15zm-18 26c-3.3 0-6 2.7-6 6v18c0 3.3 2.7 6 6 6h36c3.3 0 6-2.7 6-6V40c0-3.3-2.7-6-6-6H18zm18 8c2.2 0 4 1.8 4 4 0 1.5-.8 2.8-2 3.4V56h-4v-6.6c-1.2-.6-2-1.9-2-3.4 0-2.2 1.8-4 4-4z"
      />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [otp, setOtp] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      } else if (params.get("mode") !== "signup") {
        setEmail("customer@haramain.local");
        setPassword("CustomerDev!234");
      }
    } catch {
      if (params.get("mode") !== "signup") {
        setEmail("customer@haramain.local");
        setPassword("CustomerDev!234");
      }
    }
  }, [params]);

  function persistRemember(nextEmail: string) {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, nextEmail.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  }

  async function requestOtp(targetEmail: string) {
    const res = await fetch(`${API}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.message ?? t(locale, "signupOtpRequestFailed"));
    }
    if (typeof body.debugCode === "string") {
      setDebugCode(body.debugCode);
      setMessage(`${t(locale, "signupSandboxCode")}: ${body.debugCode}`);
    } else {
      setDebugCode(null);
      setMessage(t(locale, "signupOtpSent"));
    }
  }

  async function onLogin() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? t(locale, "authSignInFailed"));
        return;
      }
      saveAccessToken(body.accessToken);
      persistRemember(email);
      setMessage(`${t(locale, "authSignedInAs")} ${body.user.email}`);
      router.push(`/trips?lang=${locale}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "authSignInFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onRegister() {
    setError(null);
    setMessage(null);
    if (password.length < 10) {
      setError(t(locale, "signupPasswordHint"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, locale }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? body?.code ?? t(locale, "signupFailed"));
        return;
      }
      if (body.accessToken) saveAccessToken(body.accessToken);
      persistRemember(email);
      await requestOtp(email);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "signupFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? t(locale, "signupVerifyFailed"));
        return;
      }
      setMessage(t(locale, "signupVerified"));
      router.push(`/trips?lang=${locale}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "signupVerifyFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    setError(null);
    setBusy(true);
    try {
      await requestOtp(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "signupOtpRequestFailed"));
    } finally {
      setBusy(false);
    }
  }

  const fieldLabel: React.CSSProperties = {
    minWidth: 96,
    fontWeight: 600,
    fontSize: 15,
    color: "rgba(255,255,255,0.92)",
  };
  const fieldInput: React.CSSProperties = {
    flex: 1,
    minHeight: 42,
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.55)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: 15,
    outline: "none",
  };
  const outlineBtn: React.CSSProperties = {
    minHeight: 42,
    minWidth: 110,
    padding: "8px 16px",
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.75)",
    background: "transparent",
    color: "#fff",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 14,
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.7 : 1,
  };

  return (
    <SiteChrome locale={locale}>
      <div
        style={{
          maxWidth: 520,
          marginInline: "auto",
          borderRadius: 8,
          overflow: "hidden",
          background:
            "radial-gradient(900px 420px at 20% 10%, rgba(23,74,139,0.55), transparent 55%), linear-gradient(165deg, #0B1F3A 0%, #12345A 48%, #0B1F3A 100%)",
          boxShadow: "0 18px 50px rgba(11,31,58,0.28)",
          padding: "28px 28px 24px",
          color: "#fff",
        }}
      >
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          {t(locale, "pilot")}
        </p>

        {step === "verify" ? (
          <form onSubmit={onVerify} style={{ display: "grid", gap: 16 }}>
            <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>
              {t(locale, "signupVerifyTitle")}
            </h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 1.5 }}>
              {t(locale, "signupVerifyBody")}
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
              {t(locale, "signupEmail")}: <strong>{email}</strong>
            </p>
            <label style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={fieldLabel}>{t(locale, "signupOtpLabel")}</span>
              <input
                style={{ ...fieldInput, maxWidth: 180, letterSpacing: "0.2em" }}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
              />
            </label>
            {debugCode ? (
              <p style={{ margin: 0, color: "#C6A15B", fontSize: 13 }}>
                {t(locale, "signupSandboxCode")}: <code>{debugCode}</code>
              </p>
            ) : null}
            {error ? (
              <p role="alert" style={{ color: "#FFB4A8", margin: 0 }}>
                {error}
              </p>
            ) : null}
            {message ? <p style={{ color: "#9BE7C4", margin: 0 }}>{message}</p> : null}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button type="submit" disabled={busy || otp.length !== 6} style={outlineBtn}>
                {busy ? t(locale, "signupWorking") : t(locale, "signupVerifyCta")}
              </button>
              <button
                type="button"
                onClick={() => void resendOtp()}
                disabled={busy}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#C6A15B",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 0,
                }}
              >
                {t(locale, "signupResendOtp")}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onLogin();
            }}
            style={{ display: "grid", gap: 18 }}
          >
            <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>
              {t(locale, "accountNav")}
            </h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 1.5 }}>
              {t(locale, "authOnePageBody")}
            </p>

            <label style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={fieldLabel}>{t(locale, "signupEmail")}</span>
              <input
                style={fieldInput}
                type="email"
                required
                value={email}
                placeholder="email@example.com"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>

            <label style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={fieldLabel}>{t(locale, "signupPassword")}</span>
              <input
                style={fieldInput}
                type="password"
                required
                value={password}
                placeholder="********"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            <label
              style={{
                display: "inline-flex",
                gap: 10,
                alignItems: "center",
                color: "rgba(255,255,255,0.88)",
                fontSize: 14,
                width: "fit-content",
              }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              {t(locale, "authRememberMe")}
            </label>

            <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              {t(locale, "signupPasswordHint")}
            </p>

            {error ? (
              <p role="alert" style={{ color: "#FFB4A8", margin: 0 }}>
                {error}
              </p>
            ) : null}
            {message ? <p style={{ color: "#9BE7C4", margin: 0 }}>{message}</p> : null}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                marginTop: 4,
              }}
            >
              <LockMark />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="submit" disabled={busy} style={outlineBtn}>
                  {busy ? t(locale, "signupWorking") : t(locale, "authLoginBtn")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRegister()}
                  style={outlineBtn}
                >
                  {t(locale, "authRegisterBtn")}
                </button>
              </div>
            </div>
          </form>
        )}

        <p style={{ margin: "20px 0 0", fontSize: 13 }}>
          <Link href={`/trips?lang=${locale}`} style={{ color: "rgba(255,255,255,0.75)" }}>
            {t(locale, "myTrips")}
          </Link>
        </p>
      </div>
    </SiteChrome>
  );
}
