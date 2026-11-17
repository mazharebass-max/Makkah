import * as SecureStore from "expo-secure-store";

declare const process: { env?: Record<string, string | undefined> } | undefined;

const API_URL = process?.env?.EXPO_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1";

const TOKEN_KEY = "haramain_driver_access";

export async function setToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  auth?: boolean;
};

export async function api<T>(path: string, init: FetchInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...init.headers,
  };
  if (init.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await globalThis.fetch(`${API_URL}${path}`, {
    method: init.method,
    headers,
    body: init.body,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body?.message ?? `HTTP ${res.status}`), {
      status: res.status,
      body,
    });
  }
  return body as T;
}

export async function login(email: string, password: string) {
  const body = await api<{ accessToken: string }>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  await setToken(body.accessToken);
  return body;
}
