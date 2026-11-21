export type AdminUser = {
  id?: string;
  email: string;
  roles: string[];
  mfaEnabled?: boolean;
};

export type AdminSession = {
  accessToken: string;
  user: AdminUser;
};

const KEY = "haramain.admin.session";

export function loadSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.accessToken || !parsed?.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}
