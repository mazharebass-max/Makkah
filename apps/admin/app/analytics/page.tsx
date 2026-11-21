"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson } from "../../lib/api";

export default function AnalyticsPage() {
  return (
    <AdminGate
      active="analytics"
      title="Analytics sign in"
      hint="Basic event hooks — not a marketing attribution stack."
      defaultEmail="admin@haramain.local"
      defaultPassword="AdminDev!23456"
    >
      {({ token, setMessage }) => <AnalyticsBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function AnalyticsBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [summary, setSummary] = useState<{
    windowDays?: number;
    events?: { name: string; count: number }[];
    totals?: { bookings: number; notifications: number; openSupportTickets: number };
  } | null>(null);

  const refresh = useCallback(async () => {
    const { body } = await apiJson<typeof summary>("/admin/analytics/summary", { token });
    setSummary(body);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function trackDemo() {
    await apiJson("/analytics/events", {
      method: "POST",
      body: JSON.stringify({
        name: "admin.analytics.view",
        props: { milestone: "admin-console" },
        source: "admin",
      }),
    });
    await refresh();
    setMessage("Recorded admin.analytics.view");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Analytics hooks</h1>
      <p style={{ margin: 0, color: "#526276" }}>
        Last {summary?.windowDays ?? 7} days of named events + ops totals.
      </p>
      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="success">bookings {summary?.totals?.bookings ?? 0}</Badge>
          <Badge tone="success">notifications {summary?.totals?.notifications ?? 0}</Badge>
          <Badge tone="warning">open tickets {summary?.totals?.openSupportTickets ?? 0}</Badge>
          <Button type="button" onClick={() => void trackDemo()}>
            Record view event
          </Button>
          <Button type="button" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
        <strong>Top events</strong>
        <ul>
          {(summary?.events ?? []).map((e) => (
            <li key={e.name}>
              {e.name}: {e.count}
            </li>
          ))}
          {(summary?.events ?? []).length === 0 ? <li>No events yet</li> : null}
        </ul>
      </section>
    </div>
  );
}
