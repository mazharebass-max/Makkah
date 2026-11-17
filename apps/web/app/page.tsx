import { Badge, Button, PublicShell } from "@haramain/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function fetchRoutes() {
  try {
    const res = await fetch(`${API}/routes`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data: { code: string; nameEn: string; draftLabel: string }[];
    };
    return json.data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const routes = await fetchRoutes();

  return (
    <PublicShell
      nav={
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="#routes">Routes</a>
          <a href="/login">Sign in</a>
        </div>
      }
    >
      <section
        style={{
          display: "grid",
          gap: 20,
          maxWidth: 720,
          animation: "hr-fade 500ms ease both",
        }}
      >
        <Badge tone="warning">Pilot platform · not live licensed operations</Badge>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          Haramain Ride
        </h1>
        <p style={{ margin: 0, fontSize: 18, color: "#526276", maxWidth: 540 }}>
          Calm, credible ground transport for Jeddah, Makkah and Madinah — owned fleet
          plus verified third-party partners when approved.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button>Start a booking</Button>
          <Button variant="secondary">How verification works</Button>
        </div>
      </section>

      <section id="routes" style={{ marginTop: 56, display: "grid", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>Draft launch routes</h2>
        <p style={{ margin: 0, color: "#526276" }}>
          Fares and activation require owner approval. Labels below are synthetic seed data.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {routes.length === 0 ? (
            <li style={{ color: "#526276" }}>API offline — start `apps/api` to load routes.</li>
          ) : (
            routes.map((r) => (
              <li
                key={r.code}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "16px 18px",
                  boxShadow: "0 12px 40px rgba(11,31,58,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{r.nameEn}</strong>
                  <div style={{ color: "#526276", fontSize: 13 }}>{r.code}</div>
                </div>
                <Badge tone="warning">{r.draftLabel}</Badge>
              </li>
            ))
          )}
        </ul>
      </section>

      <style>{`
        @keyframes hr-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </PublicShell>
  );
}
