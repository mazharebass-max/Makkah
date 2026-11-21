"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Badge, Button, Input } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson, errMessage } from "../../lib/api";

type Flag = { key: string; enabled: boolean; description?: string; draftLabel?: string };
type Setting = { key: string; value?: Record<string, unknown>; draftLabel?: string };

export default function SettingsPage() {
  return (
    <AdminGate
      active="settings"
      title="Settings sign in"
      hint="Feature flags, system settings, and admin TOTP MFA scaffold. Super admin preferred."
      defaultEmail="admin@haramain.local"
      defaultPassword="AdminDev!23456"
    >
      {({ token, setMessage }) => <SettingsBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function SettingsBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaStatus, setMfaStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [f, s] = await Promise.all([
      apiJson<{ data?: Flag[] }>("/admin/settings/feature-flags", { token }),
      apiJson<{ data?: Setting[] }>("/admin/settings/system", { token }),
    ]);
    if (f.ok) setFlags(f.body.data ?? (Array.isArray(f.body) ? (f.body as Flag[]) : []));
    else setMessage(errMessage(f.body, `Flags ${f.status}`));
    if (s.ok) setSettings(s.body.data ?? (Array.isArray(s.body) ? (s.body as Setting[]) : []));
  }, [token, setMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleFlag(key: string, enabled: boolean) {
    const { ok, body } = await apiJson(`/admin/settings/feature-flags/${encodeURIComponent(key)}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (!ok) {
      setMessage(errMessage(body, "Could not update flag"));
      return;
    }
    setMessage(`Flag ${key} → ${!enabled ? "on" : "off"}`);
    await refresh();
  }

  async function enrollMfa() {
    const { ok, body } = await apiJson<{ otpauthUrl?: string; message?: string }>(
      "/auth/mfa/totp/enroll",
      { method: "POST", token },
    );
    if (!ok) {
      setMessage(errMessage(body, "MFA enroll failed"));
      return;
    }
    setOtpauth(body.otpauthUrl ?? null);
    setMfaStatus(body.message ?? "Scan otpauth URL in authenticator, then confirm.");
  }

  async function confirmMfa(e: FormEvent) {
    e.preventDefault();
    const { ok, body } = await apiJson<{ message?: string; mfaEnabled?: boolean }>(
      "/auth/mfa/totp/confirm",
      { method: "POST", token, body: JSON.stringify({ code: mfaCode }) },
    );
    if (!ok) {
      setMessage(errMessage(body, "MFA confirm failed"));
      return;
    }
    setMfaStatus(body.message ?? "MFA enabled");
    setMessage(body.message ?? "Admin TOTP MFA enabled (scaffold)");
    setMfaCode("");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Settings</h1>
      <p style={{ margin: 0, color: "#526276" }}>
        F5 feature flags & system settings plus F2 admin TOTP scaffold. Never claims production
        go-live.
      </p>

      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 10 }}>
        <strong>Feature flags</strong>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {flags.length === 0 ? <li>No flags (or role cannot list them)</li> : null}
          {flags.map((f) => (
            <li
              key={f.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                borderTop: "1px solid rgba(11,31,58,0.08)",
                paddingTop: 8,
              }}
            >
              <div>
                <strong>{f.key}</strong>
                <div style={{ color: "#526276", fontSize: 13 }}>{f.description}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge tone={f.enabled ? "success" : "warning"}>
                  {f.enabled ? "enabled" : "disabled"}
                </Badge>
                <Button type="button" onClick={() => void toggleFlag(f.key, f.enabled)}>
                  Toggle
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 10 }}>
        <strong>System settings</strong>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {settings.length === 0 ? <li>No settings visible for this role</li> : null}
          {settings.map((s) => (
            <li key={s.key} style={{ borderTop: "1px solid rgba(11,31,58,0.08)", paddingTop: 8 }}>
              <strong>{s.key}</strong>
              <pre
                style={{
                  margin: "8px 0 0",
                  padding: 12,
                  background: "#F6F4EF",
                  borderRadius: 8,
                  overflow: "auto",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(s.value ?? {}, null, 2)}
              </pre>
              {s.draftLabel ? <Badge tone="warning">{s.draftLabel}</Badge> : null}
            </li>
          ))}
        </ul>
        <Button type="button" onClick={() => void refresh()}>
          Refresh
        </Button>
      </section>

      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 10 }}>
        <strong>Admin TOTP MFA (scaffold)</strong>
        <p style={{ margin: 0, color: "#526276", fontSize: 14 }}>
          Enroll an authenticator for this staff account. Confirm with a 6-digit code. Not a
          production MFA mandate claim.
        </p>
        <Button type="button" onClick={() => void enrollMfa()}>
          Enroll TOTP
        </Button>
        {otpauth ? (
          <code style={{ fontSize: 12, wordBreak: "break-all", color: "#0B1F3A" }}>{otpauth}</code>
        ) : null}
        {mfaStatus ? <p style={{ margin: 0, color: "#526276" }}>{mfaStatus}</p> : null}
        <form onSubmit={confirmMfa} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Input
            label="Confirm code"
            value={mfaCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMfaCode(e.target.value)}
            inputMode="numeric"
          />
          <Button type="submit">Confirm MFA</Button>
        </form>
      </section>
    </div>
  );
}
