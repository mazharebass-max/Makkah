"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { API } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { saveAccessToken } from "../../lib/session";

type Mode = "signin" | "signup";
type Step = "form" | "verify";

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const modeParam = params.get("mode");
  const [mode, setMode] = useState<Mode>(modeParam === "signup" ? "signup" : "signin");
  const [step, setStep] = useState<Step>("form");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(modeParam === "signup" ? "" : "customer@haramain.local");
  const [password, setPassword] = useState(modeParam === "signup" ? "" : "CustomerDev!234");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (modeParam === "signup" || modeParam === "signin") {
      setMode(modeParam);
      setStep("form");
      setError(null);
      setMessage(null);
      setOtp("");
      setDebugCode(null);
    }
  }, [modeParam]);

  function switchMode(next: Mode) {
    setMode(next);
    setStep("form");
    setError(null);
    setMessage(null);
    setOtp("");
    setDebugCode(null);
    setConfirm("");
    if (next === "signin") {
      setEmail("customer@haramain.local");
      setPassword("CustomerDev!234");
    } else {
      setEmail("");
      setPassword("");
      setDisplayName("");
    }
    const q = new URLSearchParams(params.toString());
    q.set("lang", locale);
    q.set("mode", next);
    router.replace(`/login?${q.toString()}`);
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

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
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
      setMessage(`${t(locale, "authSignedInAs")} ${body.user.email}`);
      router.push(`/trips?lang=${locale}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "authSignInFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 10) {
      setError(t(locale, "signupPasswordHint"));
      return;
    }
    if (password !== confirm) {
      setError(t(locale, "signupPasswordMismatch"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          displayName: displayName.trim() || undefined,
          locale,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? body?.code ?? t(locale, "signupFailed"));
        return;
      }
      if (body.accessToken) {
        saveAccessToken(body.accessToken);
      }
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

  const title =
    step === "verify"
      ? t(locale, "signupVerifyTitle")
      : mode === "signin"
        ? t(locale, "signIn")
        : t(locale, "signUp");
  const bodyText =
    step === "verify"
      ? t(locale, "signupVerifyBody")
      : mode === "signin"
        ? t(locale, "authSignInBody")
        : t(locale, "signupBody");

  return (
    <SiteChrome locale={locale}>
      <div
        style={{
          maxWidth: 440,
          display: "grid",
          gap: 16,
          background: "#fff",
          padding: 24,
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(11,31,58,0.08)",
        }}
      >
        <Badge tone="warning">{t(locale, "pilot")}</Badge>
        <h1 style={{ margin: 0, fontSize: 28 }}>{title}</h1>
        <p style={{ margin: 0, color: "#526276", fontSize: 14, lineHeight: 1.5 }}>{bodyText}</p>

        {step === "form" ? (
          <div
            role="tablist"
            aria-label={t(locale, "authModesLabel")}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 4,
              padding: 4,
              background: "#F6F3EC",
              borderRadius: 12,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => switchMode("signin")}
              style={{
                border: "none",
                borderRadius: 10,
                minHeight: 40,
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                background: mode === "signin" ? "#fff" : "transparent",
                color: "#0B1F3A",
                boxShadow: mode === "signin" ? "0 1px 4px rgba(11,31,58,0.08)" : "none",
              }}
            >
              {t(locale, "signIn")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => switchMode("signup")}
              style={{
                border: "none",
                borderRadius: 10,
                minHeight: 40,
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                background: mode === "signup" ? "#fff" : "transparent",
                color: "#0B1F3A",
                boxShadow: mode === "signup" ? "0 1px 4px rgba(11,31,58,0.08)" : "none",
              }}
            >
              {t(locale, "signUp")}
            </button>
          </div>
        ) : null}

        {step === "verify" ? (
          <form onSubmit={onVerify} style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, color: "#526276", fontSize: 14 }}>
              {t(locale, "signupEmail")}: <strong>{email}</strong>
            </p>
            <Input
              label={t(locale, "signupOtpLabel")}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="one-time-code"
            />
            {debugCode ? (
              <p style={{ margin: 0, color: "#087F6D", fontSize: 13 }}>
                {t(locale, "signupSandboxCode")}: <code>{debugCode}</code>
              </p>
            ) : null}
            {error ? (
              <p role="alert" style={{ color: "#B42318", margin: 0 }}>
                {error}
              </p>
            ) : null}
            {message ? <p style={{ color: "#087F6D", margin: 0 }}>{message}</p> : null}
            <Button type="submit" disabled={busy || otp.length !== 6}>
              {busy ? t(locale, "signupWorking") : t(locale, "signupVerifyCta")}
            </Button>
            <button
              type="button"
              onClick={() => void resendOtp()}
              disabled={busy}
              style={{
                border: "none",
                background: "transparent",
                color: "#174A8B",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
                textAlign: "start",
              }}
            >
              {t(locale, "signupResendOtp")}
            </button>
          </form>
        ) : mode === "signin" ? (
          <form onSubmit={onSignIn} style={{ display: "grid", gap: 14 }}>
            <Input
              label={t(locale, "signupEmail")}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label={t(locale, "signupPassword")}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error ? (
              <p role="alert" style={{ color: "#B42318", margin: 0 }}>
                {error}
              </p>
            ) : null}
            {message ? <p style={{ color: "#087F6D", margin: 0 }}>{message}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? t(locale, "signupWorking") : t(locale, "signIn")}
            </Button>
          </form>
        ) : (
          <form onSubmit={onSignUp} style={{ display: "grid", gap: 14 }}>
            <Input
              label={t(locale, "signupDisplayName")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              label={t(locale, "signupEmail")}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label={t(locale, "signupPassword")}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label={t(locale, "signupConfirmPassword")}
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <p style={{ margin: 0, color: "#526276", fontSize: 13 }}>{t(locale, "signupPasswordHint")}</p>
            {error ? (
              <p role="alert" style={{ color: "#B42318", margin: 0 }}>
                {error}
              </p>
            ) : null}
            {message ? <p style={{ color: "#087F6D", margin: 0 }}>{message}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? t(locale, "signupWorking") : t(locale, "signUp")}
            </Button>
          </form>
        )}

        <Link href={`/trips?lang=${locale}`} style={{ fontSize: 14 }}>
          {t(locale, "myTrips")}
        </Link>
      </div>
    </SiteChrome>
  );
}
