"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { AdminShell, Badge, Button, Input } from "@haramain/ui";
import { apiJson, errMessage } from "../lib/api";
import { adminNav, type AdminNavKey } from "../lib/nav";
import {
  clearSession,
  loadSession,
  saveSession,
  type AdminSession,
  type AdminUser,
} from "../lib/session";

type Props = {
  active: AdminNavKey;
  title?: string;
  hint?: string;
  defaultEmail?: string;
  defaultPassword?: string;
  children: (ctx: {
    token: string;
    user: AdminUser;
    setMessage: (m: string | null) => void;
  }) => ReactNode;
};

export function AdminGate({
  active,
  title = "Staff sign in",
  hint = "Shared session across admin pages. Staff roles only — no customer access.",
  defaultEmail = "admin@haramain.local",
  defaultPassword = "AdminDev!23456",
  children,
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const existing = loadSession();
    if (existing) setSession(existing);
    setBooting(false);
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const { ok, body } = await apiJson<{
      accessToken?: string;
      user?: AdminUser;
      mfaRequired?: boolean;
      mfaToken?: string;
      message?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!ok) {
      setMessage(errMessage(body, "Login failed"));
      return;
    }
    if (body.mfaRequired && body.mfaToken) {
      setMfaToken(body.mfaToken);
      setMessage(body.message ?? "Enter authenticator code");
      return;
    }
    if (!body.accessToken || !body.user) {
      setMessage("Unexpected login response");
      return;
    }
    const next = { accessToken: body.accessToken, user: body.user };
    saveSession(next);
    setSession(next);
    setMfaToken(null);
  }

  async function verifyMfa(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setMessage(null);
    const { ok, body } = await apiJson<{
      accessToken?: string;
      user?: AdminUser;
      message?: string;
    }>("/auth/mfa/totp/verify", {
      method: "POST",
      body: JSON.stringify({ mfaToken, code: mfaCode }),
    });
    if (!ok || !body.accessToken || !body.user) {
      setMessage(errMessage(body, "MFA verify failed"));
      return;
    }
    const next = { accessToken: body.accessToken, user: body.user };
    saveSession(next);
    setSession(next);
    setMfaToken(null);
    setMfaCode("");
  }

  function logout() {
    clearSession();
    setSession(null);
    setMfaToken(null);
    setMessage(null);
  }

  if (booting) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <p style={{ color: "#526276" }}>Loading session…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, marginTop: 0 }}>{title}</h1>
        <p style={{ color: "#526276" }}>{hint}</p>
        {mfaToken ? (
          <form onSubmit={verifyMfa} style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <Badge tone="warning">Admin MFA scaffold — TOTP required</Badge>
            <Input
              label="Authenticator code"
              value={mfaCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMfaCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            {message ? <p style={{ color: "#B42318", margin: 0 }}>{message}</p> : null}
            <Button type="submit">Verify MFA</Button>
            <Button type="button" onClick={() => setMfaToken(null)}>
              Back
            </Button>
          </form>
        ) : (
          <form onSubmit={login} style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <Input
              label="Email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
            {message ? <p style={{ color: "#B42318", margin: 0 }}>{message}</p> : null}
            <Button type="submit">Sign in</Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <AdminShell
      userLabel={`${session.user.email} · ${session.user.roles.join(", ")}`}
      navItems={adminNav(active)}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button type="button" onClick={logout}>
          Sign out
        </Button>
      </div>
      {message ? (
        <p style={{ color: "#087F6D", marginTop: 0 }}>{message}</p>
      ) : null}
      {children({
        token: session.accessToken,
        user: session.user,
        setMessage,
      })}
    </AdminShell>
  );
}
