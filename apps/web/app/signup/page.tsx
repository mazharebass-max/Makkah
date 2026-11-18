"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../components/SiteChrome";
import { API } from "../../lib/api";
import { t, type Locale } from "../../lib/i18n";
import { saveAccessToken } from "../../lib/session";

type Step = "register" | "verify";

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const [step, setStep] = useState<Step>("register");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function onRegister(e: React.FormEvent) {
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
        <h1 style={{ margin: 0, fontSize: 28 }}>
          {step === "register" ? t(locale, "signUp") : t(locale, "signupVerifyTitle")}
        </h1>
        <p style={{ margin: 0, color: "#526276", fontSize: 14, lineHeight: 1.5 }}>
          {step === "register" ? t(locale, "signupBody") : t(locale, "signupVerifyBody")}
        </p>

        {step === "register" ? (
          <form onSubmit={onRegister} style={{ display: "grid", gap: 14 }}>
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
        ) : (
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
        )}

        <p style={{ margin: 0, fontSize: 14 }}>
          {t(locale, "signupHaveAccount")}{" "}
          <Link href={`/login?lang=${locale}`} style={{ color: "#174A8B", fontWeight: 600 }}>
            {t(locale, "signIn")}
          </Link>
        </p>
      </div>
    </SiteChrome>
  );
}
