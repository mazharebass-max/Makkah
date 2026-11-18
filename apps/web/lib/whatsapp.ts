/**
 * Public WhatsApp contact — only from NEXT_PUBLIC_WHATSAPP_E164.
 * Leave empty until the owner supplies a real Haramain number; never invent one.
 */
export function whatsappE164(): string | null {
  const raw = (process.env.NEXT_PUBLIC_WHATSAPP_E164 ?? "").trim();
  if (!raw) return null;
  // Accept +9665… or 9665…; require Saudi mobile-length digits for safety
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return raw.startsWith("+") ? `+${digits}` : `+${digits}`;
}

export function whatsappHref(e164: string, prefill?: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  const base = `https://wa.me/${digits}`;
  if (!prefill) return base;
  return `${base}?text=${encodeURIComponent(prefill)}`;
}

export function whatsappDisplay(e164: string): string {
  // +966501234567 → +966 50 123 4567 (best-effort for SA mobiles)
  const m = e164.match(/^\+966(\d{2})(\d{3})(\d{4})$/);
  if (m) return `+966 ${m[1]} ${m[2]} ${m[3]}`;
  return e164;
}
