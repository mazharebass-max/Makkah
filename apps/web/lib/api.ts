export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type RouteRow = {
  id: string;
  code: string;
  nameEn: string;
  nameAr?: string | null;
  draftLabel: string;
};

export async function fetchRoutes(): Promise<RouteRow[]> {
  try {
    const res = await fetch(`${API}/routes`, { next: { revalidate: 15 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: RouteRow[] };
    return json.data;
  } catch {
    return [];
  }
}

export type PickupPointRow = {
  code: string;
  nameEn: string;
  nameAr?: string | null;
  kind: string;
  draftLabel: string;
  zone: { code: string; nameEn: string; nameAr?: string | null };
};

export async function fetchPickupPoints(zoneCode?: string): Promise<PickupPointRow[]> {
  try {
    const q = zoneCode ? `?zoneCode=${encodeURIComponent(zoneCode)}` : "";
    const res = await fetch(`${API}/pickup-points${q}`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: PickupPointRow[] };
    return json.data;
  } catch {
    return [];
  }
}

export function defaultScheduleIso() {
  const d = new Date(Date.now() + 48 * 3600_000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export type DailyHighlight = {
  dayKey: string;
  timezone: string;
  data: {
    slug: string;
    titleEn: string;
    captionEn: string;
    captionAr: string;
    visualHint: string | null;
    status: string;
  } | null;
  note?: string;
};

/** Today's marketing highlight for the public site (rotates daily Asia/Riyadh). */
export async function fetchDailyHighlight(): Promise<DailyHighlight | null> {
  try {
    const res = await fetch(`${API}/marketing/daily`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as DailyHighlight;
  } catch {
    return null;
  }
}
