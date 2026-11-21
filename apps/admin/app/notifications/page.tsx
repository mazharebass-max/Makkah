"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson, errMessage } from "../../lib/api";

export default function NotificationsPage() {
  return (
    <AdminGate
      active="notifications"
      title="Notifications sign in"
      hint="Outbox drain is sandbox-only — never live SMS/email."
      defaultEmail="support@haramain.local"
      defaultPassword="SupportDev!2345"
    >
      {({ token, setMessage }) => <NotificationsBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function NotificationsBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [queue, setQueue] = useState<{
    pendingOutbox?: number;
    recent?: { id: string; templateCode: string; status: string; toAddress: string; createdAt: string }[];
    liveDelivery?: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    const { body } = await apiJson<typeof queue>("/admin/notifications/queue", { token });
    setQueue(body);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function processOutbox() {
    const { ok, body } = await apiJson<{
      processed?: number;
      sent?: number;
      remaining?: number;
      message?: unknown;
    }>("/admin/notifications/process-outbox", { method: "POST", token });
    if (!ok) {
      setMessage(errMessage(body, "Process failed"));
      return;
    }
    setMessage(
      `Processed ${body.processed ?? 0} · sent ${body.sent ?? 0} · remaining ${body.remaining ?? 0} (sandbox)`,
    );
    await refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Notification outbox</h1>
      <p style={{ margin: 0, color: "#526276" }}>
        Transactional queue via OutboxEvent → sandbox email/SMS adapters.
      </p>
      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Badge tone="warning">pending outbox: {queue?.pendingOutbox ?? 0}</Badge>
          <Badge tone="success">liveDelivery={String(queue?.liveDelivery ?? false)}</Badge>
          <Button type="button" onClick={() => void processOutbox()}>
            Process outbox
          </Button>
          <Button type="button" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
        <strong>Recent sandbox sends</strong>
        <ul style={{ marginTop: 4 }}>
          {(queue?.recent ?? []).map((n) => (
            <li key={n.id}>
              {n.templateCode} · {n.status} · {n.toAddress} ·{" "}
              {new Date(n.createdAt).toLocaleString()}
            </li>
          ))}
          {(queue?.recent ?? []).length === 0 ? <li>No notifications yet</li> : null}
        </ul>
      </section>
    </div>
  );
}
