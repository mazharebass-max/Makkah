"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson, errMessage } from "../../lib/api";

type Post = {
  id: string;
  slug: string;
  titleEn: string;
  captionEn: string;
  captionAr: string;
  visualHint: string | null;
  channels: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  sandboxRef: string | null;
  livePublish: boolean;
};

export default function MarketingPage() {
  return (
    <AdminGate
      active="marketing"
      title="Marketing sign in"
      hint="Social copy queue — sandbox publish only until Meta/TikTok tokens + owner approval."
      defaultEmail="admin@haramain.local"
      defaultPassword="AdminDev!23456"
    >
      {({ token, setMessage }) => <MarketingBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function MarketingBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [captionEn, setCaptionEn] = useState("");
  const [captionAr, setCaptionAr] = useState("");
  const [visualHint, setVisualHint] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { ok, body } = await apiJson<{ data?: Post[]; note?: string; message?: unknown }>(
      "/admin/marketing/posts",
      { token },
    );
    if (!ok) {
      setMessage(errMessage(body, "Failed to load posts"));
      return;
    }
    setPosts(body.data ?? []);
    setNote(body.note ?? null);
  }, [token, setMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createPost() {
    setBusy(true);
    const { ok, body } = await apiJson<Post & { message?: unknown }>("/admin/marketing/posts", {
      method: "POST",
      token,
      body: JSON.stringify({
        titleEn,
        captionEn,
        captionAr,
        visualHint: visualHint || undefined,
        channels: ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
        scheduledAt: scheduledAt || undefined,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
      }),
    });
    setBusy(false);
    if (!ok) {
      setMessage(errMessage(body, "Create failed"));
      return;
    }
    setMessage(`Created ${body.slug}`);
    setTitleEn("");
    setCaptionEn("");
    setCaptionAr("");
    setVisualHint("");
    setScheduledAt("");
    await refresh();
  }

  async function approve(id: string) {
    const { ok, body } = await apiJson(`/admin/marketing/posts/${id}/approve`, {
      method: "POST",
      token,
    });
    if (!ok) {
      setMessage(errMessage(body, "Approve failed"));
      return;
    }
    setMessage("Approved / scheduled");
    await refresh();
  }

  async function processDue() {
    const { ok, body } = await apiJson<{
      published?: number;
      remaining?: number;
      message?: unknown;
    }>("/admin/marketing/process-due", { method: "POST", token });
    if (!ok) {
      setMessage(errMessage(body, "Process failed"));
      return;
    }
    setMessage(
      `Sandbox published ${body.published ?? 0} · remaining due ${body.remaining ?? 0} (not sent to Meta)`,
    );
    await refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Marketing queue</h1>
      <p style={{ margin: 0, color: "#526276", maxWidth: 720 }}>
        Schedule bilingual posts for Instagram / Facebook / TikTok. Process due marks{" "}
        <strong>PUBLISHED_SANDBOX</strong> only — live social APIs stay off until pages exist and you
        add tokens.
      </p>
      {note ? (
        <Badge tone="warning">{note}</Badge>
      ) : (
        <Badge tone="warning">liveSocialApi=false</Badge>
      )}

      <section
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 20,
          display: "grid",
          gap: 12,
          maxWidth: 720,
        }}
      >
        <strong>New post</strong>
        <Input label="Title (EN)" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Caption EN</span>
          <textarea
            value={captionEn}
            onChange={(e) => setCaptionEn(e.target.value)}
            rows={3}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(11,31,58,0.15)",
              fontFamily: "inherit",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Caption AR</span>
          <textarea
            value={captionAr}
            onChange={(e) => setCaptionAr(e.target.value)}
            rows={3}
            dir="rtl"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(11,31,58,0.15)",
              fontFamily: "inherit",
            }}
          />
        </label>
        <Input
          label="Visual hint"
          value={visualHint}
          onChange={(e) => setVisualHint(e.target.value)}
        />
        <Input
          label="Schedule (ISO datetime, optional)"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          placeholder="2026-11-25T15:00:00.000Z"
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            type="button"
            disabled={busy || !titleEn.trim() || captionEn.length < 8 || captionAr.length < 8}
            onClick={() => void createPost()}
          >
            Add to queue
          </Button>
          <Button type="button" variant="secondary" onClick={() => void processDue()}>
            Process due (sandbox)
          </Button>
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <strong>Queue ({posts.length})</strong>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {posts.map((p) => (
            <li
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 16,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{p.titleEn}</strong>
                <Badge tone={p.status === "PUBLISHED_SANDBOX" ? "success" : "warning"}>
                  {p.status}
                </Badge>
              </div>
              <div style={{ color: "#526276", fontSize: 13 }}>
                {p.slug} · {p.channels.join(", ")}
                {p.scheduledAt ? ` · scheduled ${new Date(p.scheduledAt).toLocaleString()}` : ""}
                {p.sandboxRef ? ` · ${p.sandboxRef}` : ""}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#0B1F3A" }}>{p.captionEn}</p>
              <p style={{ margin: 0, fontSize: 14, color: "#526276" }} dir="rtl">
                {p.captionAr}
              </p>
              {p.status === "DRAFT" || p.status === "APPROVED" ? (
                <Button type="button" variant="secondary" onClick={() => void approve(p.id)}>
                  Approve / schedule
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
