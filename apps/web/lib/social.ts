export type SocialNetwork = "instagram" | "facebook" | "tiktok" | "x" | "youtube";

export type SocialLink = {
  network: SocialNetwork;
  label: string;
  href: string;
};

function cleanUrl(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Public social profile links — only shown when owner sets env URLs. */
export function socialLinks(): SocialLink[] {
  const candidates: Array<[SocialNetwork, string, string | undefined]> = [
    ["instagram", "Instagram", process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL],
    ["facebook", "Facebook", process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL],
    ["tiktok", "TikTok", process.env.NEXT_PUBLIC_SOCIAL_TIKTOK_URL],
    ["x", "X", process.env.NEXT_PUBLIC_SOCIAL_X_URL],
    ["youtube", "YouTube", process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL],
  ];
  const out: SocialLink[] = [];
  for (const [network, label, raw] of candidates) {
    const href = cleanUrl(raw);
    if (href) out.push({ network, label, href });
  }
  return out;
}
