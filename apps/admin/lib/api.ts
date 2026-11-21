export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function apiJson<T = unknown>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<{ ok: boolean; status: number; body: T }> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });
  let body = {} as T;
  try {
    body = (await res.json()) as T;
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, body };
}

export function errMessage(body: unknown, fallback = "Request failed"): string {
  if (!body || typeof body !== "object") return fallback;
  const b = body as { message?: unknown };
  if (typeof b.message === "string") return b.message;
  if (b.message && typeof b.message === "object") {
    const m = b.message as { message?: string; code?: string };
    return m.message ?? m.code ?? fallback;
  }
  return fallback;
}
