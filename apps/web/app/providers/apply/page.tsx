"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@haramain/ui";
import { SiteChrome } from "../../../components/SiteChrome";
import { API } from "../../../lib/api";
import { t, type Locale } from "../../../lib/i18n";

export default function ProviderApplyPage() {
  const params = useSearchParams();
  const locale: Locale = params.get("lang") === "ar" ? "ar" : "en";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch(`${API}/providers/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        legalName,
        tradeName: tradeName || undefined,
        registrationNo: registrationNo || undefined,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body?.message ?? "Application failed");
      return;
    }
    setMessage(
      `Application received · status ${body.provider?.status ?? "APPLIED"} · verificationClaim=${String(body.verificationClaim ?? false)}`,
    );
  }

  return (
    <SiteChrome locale={locale}>
      <form
        onSubmit={submit}
        style={{
          maxWidth: 520,
          display: "grid",
          gap: 14,
          background: "#fff",
          padding: 24,
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(11,31,58,0.08)",
        }}
      >
        <h1 style={{ margin: 0 }}>{t(locale, "providerApply")}</h1>
        <Badge tone="warning">{t(locale, "draft")}</Badge>
        <p style={{ margin: 0, color: "#526276" }}>{t(locale, "providerHint")}</p>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={10}
        />
        <Input
          label={t(locale, "providerLegalName")}
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
        />
        <Input
          label={t(locale, "providerTradeName")}
          value={tradeName}
          onChange={(e) => setTradeName(e.target.value)}
        />
        <Input
          label={t(locale, "providerReg")}
          value={registrationNo}
          onChange={(e) => setRegistrationNo(e.target.value)}
        />
        <Button type="submit">{t(locale, "providerSubmit")}</Button>
        {error ? (
          <p role="alert" style={{ color: "#B42318", margin: 0 }}>
            {error}
          </p>
        ) : null}
        {message ? (
          <p style={{ color: "#087F6D", margin: 0, whiteSpace: "pre-wrap" }}>{message}</p>
        ) : null}
      </form>
    </SiteChrome>
  );
}
