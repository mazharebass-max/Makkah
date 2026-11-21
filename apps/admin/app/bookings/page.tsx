"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@haramain/ui";
import { AdminGate } from "../../components/AdminGate";
import { apiJson, errMessage } from "../../lib/api";

type BookingRow = {
  id: string;
  reference: string;
  status: string;
  scheduledAt: string;
  createdAt?: string;
  totalHalalas: number;
  currency: string;
  contactName?: string | null;
  contactPhone?: string | null;
  route?: { code: string; nameEn?: string } | null;
  category?: { code: string; nameEn?: string } | null;
  assignment?: {
    driverId?: string | null;
    vehicleId?: string | null;
    driver?: { displayName?: string | null; phoneE164?: string | null } | null;
    vehicle?: { plateNumber?: string; makeModel?: string } | null;
  } | null;
};

type BookingDetail = BookingRow & {
  passengerCount?: number;
  tripTimeline?: { from: string | null; to: string; at: string; note?: string | null }[];
};

type LivePoint = {
  role: string;
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  recordedAt: string;
  ageSeconds?: number;
};

type LiveLocations = {
  bookingId: string;
  reference: string;
  status: string;
  polledAt: string;
  driver: {
    profile?: { displayName?: string | null; phoneE164?: string | null } | null;
    location: LivePoint | null;
  };
  customer: { location: LivePoint | null };
  retentionNote?: string;
  liveTracking?: boolean;
};

type DriverLog = {
  consents: {
    id: string;
    role: string;
    purpose: string;
    grantedAt: string;
    revokedAt: string | null;
    active: boolean;
  }[];
  locationSamples: {
    id: string;
    role: string;
    latitude: number;
    longitude: number;
    accuracyM?: number | null;
    recordedAt: string;
    expired: boolean;
  }[];
  auditTrail: { id: string; action: string; resource: string; at: string }[];
  retentionNote?: string;
};

function PointCard({
  title,
  subtitle,
  point,
}: {
  title: string;
  subtitle?: string;
  point: LivePoint | null;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(11,31,58,0.1)",
        borderRadius: 12,
        padding: 12,
        display: "grid",
        gap: 6,
        background: point ? "#F7FBFF" : "#FAFAF8",
      }}
    >
      <strong>{title}</strong>
      {subtitle ? <div style={{ fontSize: 12, color: "#526276" }}>{subtitle}</div> : null}
      {point ? (
        <>
          <code style={{ fontSize: 14 }}>
            {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
          </code>
          <div style={{ fontSize: 12, color: "#526276" }}>
            {new Date(point.recordedAt).toLocaleString()}
            {point.ageSeconds != null ? ` · ${point.ageSeconds}s ago` : ""}
            {point.accuracyM != null ? ` · ±${point.accuracyM}m` : ""}
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=16/${point.latitude}/${point.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1A5FBF", fontSize: 13, fontWeight: 600 }}
          >
            Open map
          </a>
        </>
      ) : (
        <div style={{ color: "#526276", fontSize: 13 }}>No active sample</div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <AdminGate
      active="bookings"
      title="Bookings sign in"
      hint="Inspect bookings plus customer/driver live location. Dispatcher / support / admin."
      defaultEmail="dispatcher@haramain.local"
      defaultPassword="DispatchDev!234"
    >
      {({ token, setMessage }) => <BookingsBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function BookingsBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [live, setLive] = useState<LiveLocations | null>(null);
  const [driverLog, setDriverLog] = useState<DriverLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshList = useCallback(async () => {
    setError(null);
    const { ok, body, status } = await apiJson<{ data?: BookingRow[]; message?: unknown }>(
      "/admin/bookings",
      { token },
    );
    if (!ok) {
      setError(errMessage(body, `Bookings failed (${status})`));
      return;
    }
    setBookings(body.data ?? []);
  }, [token]);

  const refreshLive = useCallback(
    async (id: string) => {
      const { ok, body } = await apiJson<LiveLocations>(`/admin/bookings/${id}/live-locations`, {
        token,
      });
      if (ok) setLive(body);
    },
    [token],
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId || !autoRefresh) return;
    const tick = () => void refreshLive(selectedId);
    tick();
    const t = window.setInterval(tick, 8000);
    return () => window.clearInterval(t);
  }, [selectedId, autoRefresh, refreshLive]);

  async function openBooking(id: string) {
    setSelectedId(id);
    setMessage(null);
    setDetail(null);
    setLive(null);
    setDriverLog(null);
    const [dRes, lRes, logRes] = await Promise.all([
      apiJson<BookingDetail>(`/admin/bookings/${id}`, { token }),
      apiJson<LiveLocations>(`/admin/bookings/${id}/live-locations`, { token }),
      apiJson<DriverLog>(`/admin/bookings/${id}/driver-log`, { token }),
    ]);
    if (!dRes.ok) {
      setMessage(errMessage(dRes.body, "Could not load booking"));
      return;
    }
    setDetail(dRes.body);
    if (lRes.ok) setLive(lRes.body);
    if (logRes.ok) setDriverLog(logRes.body);
  }

  const q = filter.trim().toLowerCase();
  const visible = !q
    ? bookings
    : bookings.filter(
        (b) =>
          b.reference.toLowerCase().includes(q) ||
          b.status.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.route?.code ?? "").toLowerCase().includes(q) ||
          (b.assignment?.driver?.displayName ?? "").toLowerCase().includes(q) ||
          (b.assignment?.vehicle?.plateNumber ?? "").toLowerCase().includes(q),
      );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Bookings & live location</h1>
          <p style={{ margin: "6px 0 0", color: "#526276" }}>
            Trip detail, customer + driver consented points (poll). Sandbox / draft — not licensed
            live tracking.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh live (8s)
          </label>
          <Button type="button" onClick={() => void refreshList()}>
            Refresh list
          </Button>
        </div>
      </div>
      <Badge tone="warning">DRAFT — OWNER APPROVAL REQUIRED · PDPL-minimized location</Badge>
      {error ? <p style={{ color: "#B42318", margin: 0 }}>{error}</p> : null}

      <label style={{ display: "grid", gap: 4, fontSize: 13, maxWidth: 420 }}>
        Filter
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Reference, status, driver, plate…"
          style={{
            minHeight: 40,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid rgba(11,31,58,0.16)",
            font: "inherit",
          }}
        />
      </label>

      <div
        className="hr-bookings-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, alignItems: "start" }}
      >
        <section style={{ background: "#fff", borderRadius: 16, padding: 18 }}>
          <strong>Bookings ({visible.length})</strong>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 8 }}>
            {visible.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => void openBooking(b.id)}
                  style={{
                    width: "100%",
                    textAlign: "start",
                    border: "1px solid rgba(11,31,58,0.1)",
                    borderRadius: 12,
                    padding: 12,
                    background: selectedId === b.id ? "#F3F7FB" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{b.reference}</strong>
                    <Badge tone={b.status.includes("CANCEL") ? "warning" : "success"}>
                      {b.status}
                    </Badge>
                  </div>
                  <div style={{ color: "#526276", fontSize: 13, marginTop: 4 }}>
                    {b.route?.code ?? "—"} · {b.category?.nameEn ?? b.category?.code ?? "—"} ·{" "}
                    {new Date(b.scheduledAt).toLocaleString()}
                  </div>
                  <div style={{ color: "#526276", fontSize: 12, marginTop: 2 }}>
                    {b.assignment?.driver?.displayName ||
                      b.assignment?.driverId?.slice(0, 8) ||
                      "Unassigned"}
                    {b.assignment?.vehicle?.plateNumber
                      ? ` · ${b.assignment.vehicle.plateNumber}`
                      : ""}
                  </div>
                </button>
              </li>
            ))}
            {visible.length === 0 ? <li style={{ color: "#526276" }}>No bookings match</li> : null}
          </ul>
        </section>

        <div style={{ display: "grid", gap: 16 }}>
          <section style={{ background: "#fff", borderRadius: 16, padding: 18, display: "grid", gap: 12 }}>
            {detail ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 18 }}>{detail.reference}</strong>
                  <Badge>{detail.status}</Badge>
                </div>
                <div style={{ color: "#526276", fontSize: 14, display: "grid", gap: 4 }}>
                  <div>
                    Route: {detail.route?.nameEn ?? detail.route?.code ?? "—"} ·{" "}
                    {detail.category?.nameEn ?? detail.category?.code ?? "—"}
                  </div>
                  <div>Scheduled: {new Date(detail.scheduledAt).toLocaleString()}</div>
                  <div>
                    Fare: {(detail.totalHalalas / 100).toFixed(2)} {detail.currency}
                    {detail.passengerCount != null ? ` · ${detail.passengerCount} pax` : ""}
                  </div>
                  <div>
                    Contact: {detail.contactName ?? "—"} · {detail.contactPhone ?? "—"}
                  </div>
                  <div>
                    Driver:{" "}
                    {detail.assignment?.driver?.displayName ||
                      detail.assignment?.driverId?.slice(0, 8) ||
                      "—"}
                  </div>
                  <div>
                    Vehicle:{" "}
                    {detail.assignment?.vehicle
                      ? `${detail.assignment.vehicle.plateNumber} · ${detail.assignment.vehicle.makeModel}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <strong>Trip timeline</strong>
                  <ol style={{ margin: "8px 0 0", paddingInlineStart: 20, display: "grid", gap: 6 }}>
                    {(detail.tripTimeline ?? []).map((ev, i) => (
                      <li key={`${ev.at}-${i}`}>
                        <strong>{ev.to}</strong>
                        <div style={{ color: "#526276", fontSize: 12 }}>
                          {new Date(ev.at).toLocaleString()}
                          {ev.from ? ` · from ${ev.from}` : ""}
                          {ev.note ? ` · ${ev.note}` : ""}
                        </div>
                      </li>
                    ))}
                    {(detail.tripTimeline ?? []).length === 0 ? (
                      <li style={{ color: "#526276" }}>No status events</li>
                    ) : null}
                  </ol>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: "#526276" }}>Select a booking to inspect</p>
            )}
          </section>

          <section style={{ background: "#fff", borderRadius: 16, padding: 18, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>Live locations</strong>
              {selectedId ? (
                <Button type="button" onClick={() => void refreshLive(selectedId)}>
                  Poll now
                </Button>
              ) : null}
            </div>
            {live ? (
              <>
                <p style={{ margin: 0, fontSize: 13, color: "#526276" }}>
                  Polled {new Date(live.polledAt).toLocaleTimeString()} ·{" "}
                  {live.retentionNote ?? "Consented samples only"}
                  {live.liveTracking === false ? " · liveTracking=false" : ""}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                  className="hr-live-points"
                >
                  <PointCard
                    title="Driver"
                    subtitle={
                      live.driver.profile?.displayName ||
                      live.driver.profile?.phoneE164 ||
                      undefined
                    }
                    point={live.driver.location}
                  />
                  <PointCard title="Customer" point={live.customer.location} />
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: "#526276", fontSize: 13 }}>
                Open a booking to poll customer + driver points.
              </p>
            )}
          </section>

          <section style={{ background: "#fff", borderRadius: 16, padding: 18, display: "grid", gap: 12 }}>
            <strong>Location log</strong>
            {driverLog ? (
              <>
                <div>
                  <strong style={{ fontSize: 13 }}>Consent</strong>
                  <ul style={{ margin: "6px 0 0", paddingInlineStart: 18, color: "#526276", fontSize: 13 }}>
                    {driverLog.consents.length === 0 ? <li>No consent records</li> : null}
                    {driverLog.consents.map((c) => (
                      <li key={c.id}>
                        {c.role} · {c.active ? "ACTIVE" : "revoked"} · {c.purpose} ·{" "}
                        {new Date(c.grantedAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong style={{ fontSize: 13 }}>
                    Samples ({driverLog.locationSamples.length})
                  </strong>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: "8px 0 0",
                      padding: 0,
                      display: "grid",
                      gap: 6,
                      maxHeight: 220,
                      overflow: "auto",
                    }}
                  >
                    {driverLog.locationSamples.length === 0 ? (
                      <li style={{ color: "#526276", fontSize: 13 }}>No samples</li>
                    ) : null}
                    {driverLog.locationSamples.map((s) => (
                      <li
                        key={s.id}
                        style={{
                          borderTop: "1px solid rgba(11,31,58,0.08)",
                          paddingTop: 6,
                          fontSize: 13,
                        }}
                      >
                        <strong>{s.role}</strong>{" "}
                        <code>
                          {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                        </code>
                        <div style={{ color: "#526276" }}>
                          {new Date(s.recordedAt).toLocaleString()}
                          {s.expired ? " · expired" : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: "#526276", fontSize: 13 }}>
                Consent + sample history appears after selecting a booking.
              </p>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hr-bookings-grid { grid-template-columns: 1fr !important; }
          .hr-live-points { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
