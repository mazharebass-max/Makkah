"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@haramain/ui";
import { AdminGate } from "../components/AdminGate";
import { apiJson, errMessage } from "../lib/api";

type BookingRow = {
  id: string;
  reference: string;
  status: string;
  scheduledAt: string;
  route?: { code: string };
  category?: { code: string; nameEn?: string };
};

type VehicleRow = {
  id: string;
  plateNumber: string;
  makeModel: string;
  active: boolean;
  category?: { code: string; nameEn?: string } | null;
};

type DriverRow = {
  id: string;
  displayName?: string | null;
  phoneE164?: string | null;
  active?: boolean;
};

export default function AdminHome() {
  return (
    <AdminGate
      active="overview"
      title="Admin sign in"
      hint="Dispatch & owned fleet. Shared session — use dispatcher, fleet manager, or super admin."
      defaultEmail="dispatcher@haramain.local"
      defaultPassword="DispatchDev!234"
    >
      {({ token, setMessage }) => <OverviewBody token={token} setMessage={setMessage} />}
    </AdminGate>
  );
}

function OverviewBody({
  token,
  setMessage,
}: {
  token: string;
  setMessage: (m: string | null) => void;
}) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");

  const refresh = useCallback(async () => {
    const [bRes, vRes, dRes] = await Promise.all([
      apiJson<{ data?: BookingRow[] }>("/admin/bookings", { token }),
      apiJson<{ data?: VehicleRow[] }>("/admin/fleet/vehicles", { token }),
      apiJson<{ data?: DriverRow[] }>("/admin/fleet/drivers", { token }),
    ]);
    if (bRes.ok) setBookings(bRes.body.data ?? []);
    else setError(`Bookings: ${bRes.status}`);
    if (vRes.ok) {
      const list = vRes.body.data ?? [];
      setVehicles(list);
      setVehicleId((cur) => cur || list[0]?.id || "");
    }
    if (dRes.ok) {
      const list = dRes.body.data ?? [];
      setDrivers(list);
      setDriverId((cur) => cur || list[0]?.id || "");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function assign(bookingId: string) {
    setMessage(null);
    const { ok, body } = await apiJson<{
      status?: string;
      assignment?: { vehicleId?: string };
      message?: unknown;
    }>(`/admin/bookings/${bookingId}/assign`, {
      method: "POST",
      token,
      body: JSON.stringify({
        reason: "Admin console assign",
        ...(vehicleId ? { vehicleId } : {}),
        ...(driverId ? { driverId } : {}),
      }),
    });
    if (!ok) {
      setMessage(errMessage(body, `Assign failed`));
      return;
    }
    setMessage(
      `Assigned ${bookingId.slice(0, 8)}… → ${body.status} / vehicle ${body.assignment?.vehicleId?.slice(0, 8) ?? "—"}`,
    );
    await refresh();
  }

  async function toggleVehicle(id: string, active: boolean) {
    setMessage(null);
    const { ok, body } = await apiJson(`/admin/fleet/vehicles/${id}/active`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ active: !active }),
    });
    if (!ok) {
      setMessage(errMessage(body, "Could not update vehicle"));
      return;
    }
    setMessage(`Vehicle ${id.slice(0, 8)}… → ${!active ? "active" : "inactive"}`);
    await refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Dispatch & owned fleet</h1>
      <p style={{ color: "#526276", margin: 0 }}>
        Assign paid bookings, review owned inventory, and toggle vehicle availability. Sandbox
        payments only — not live licensed ops.
      </p>
      {error ? <p style={{ color: "#B42318", margin: 0 }}>{error}</p> : null}

      <section style={{ background: "#fff", borderRadius: 16, padding: 20, display: "grid", gap: 12 }}>
        <strong>Assign defaults</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Vehicle
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              style={{ minHeight: 40, padding: "0 10px", borderRadius: 8 }}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} · {v.makeModel} {v.active ? "" : "(inactive)"}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Driver
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              style={{ minHeight: 40, padding: "0 10px", borderRadius: 8 }}
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName || d.phoneE164 || d.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      </section>

      <section id="bookings" style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
        <strong>Bookings</strong>
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 10 }}>
          {bookings.length === 0 ? <li>No bookings yet</li> : null}
          {bookings.map((b) => (
            <li
              key={b.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                borderTop: "1px solid rgba(11,31,58,0.08)",
                paddingTop: 10,
              }}
            >
              <div>
                <div>
                  <strong>{b.reference}</strong> · {b.status}
                </div>
                <div style={{ color: "#526276", fontSize: 13 }}>
                  {b.route?.code} · {b.category?.nameEn ?? b.category?.code} ·{" "}
                  {new Date(b.scheduledAt).toLocaleString()}
                </div>
              </div>
              {(b.status === "ASSIGNMENT_PENDING" ||
                b.status === "CONFIRMED" ||
                b.status === "ASSIGNED") && (
                <Button type="button" onClick={() => void assign(b.id)}>
                  Assign
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section id="fleet" style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
        <strong>Owned fleet</strong>
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 8 }}>
          {vehicles.map((v) => (
            <li
              key={v.id}
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
              <span>
                {v.plateNumber} · {v.makeModel} · {v.category?.nameEn ?? v.category?.code ?? "—"} ·{" "}
                <Badge tone={v.active ? "success" : "warning"}>
                  {v.active ? "active" : "inactive"}
                </Badge>
              </span>
              <Button type="button" onClick={() => void toggleVehicle(v.id, v.active)}>
                {v.active ? "Deactivate" : "Activate"}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
        <strong>Drivers</strong>
        <ul style={{ marginTop: 12, paddingInlineStart: 18 }}>
          {drivers.length === 0 ? <li>No drivers in seed</li> : null}
          {drivers.map((d) => (
            <li key={d.id}>
              {d.displayName || "Driver"} · {d.phoneE164 ?? d.id.slice(0, 8)} ·{" "}
              {d.active === false ? "inactive" : "active"}
            </li>
          ))}
        </ul>
      </section>
      <Badge tone="warning">DRAFT — OWNER APPROVAL REQUIRED for live ops</Badge>
    </div>
  );
}
