"use client";

import { useState } from "react";
import { Button, Input, PublicShell } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function LoginPage() {
  const [email, setEmail] = useState("customer@haramain.local");
  const [password, setPassword] = useState("CustomerDev!234");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
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
    setMessage(`Signed in as ${body.user.email} (${body.user.roles.join(", ")})`);
  }

  return (
    <PublicShell>
      <form
        onSubmit={onSubmit}
        style={{
          maxWidth: 420,
          display: "grid",
          gap: 16,
          background: "#fff",
          padding: 24,
          borderRadius: 20,
          boxShadow: "0 12px 40px rgba(11,31,58,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>Customer sign in</h1>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p role="alert" style={{ color: "#B42318", margin: 0 }}>{error}</p> : null}
        {message ? <p style={{ color: "#087F6D", margin: 0 }}>{message}</p> : null}
        <Button type="submit">Sign in</Button>
      </form>
    </PublicShell>
  );
}
