import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Generate a random base32 secret suitable for authenticator apps. */
export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

/** RFC 6238 TOTP (30s step, SHA1, 6 digits). */
export function generateTotp(secretBase32: string, atMs = Date.now(), stepSec = 30): string {
  const counter = Math.floor(atMs / 1000 / stepSec);
  return hotp(base32Decode(secretBase32), counter);
}

export function verifyTotp(
  secretBase32: string,
  token: string,
  opts?: { window?: number; atMs?: number; stepSec?: number },
): boolean {
  const window = opts?.window ?? 1;
  const atMs = opts?.atMs ?? Date.now();
  const stepSec = opts?.stepSec ?? 30;
  const expected = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(expected)) return false;
  const counter = Math.floor(atMs / 1000 / stepSec);
  const expectedBuf = Buffer.from(expected);
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(base32Decode(secretBase32), counter + w);
    const candBuf = Buffer.from(candidate);
    if (candBuf.length === expectedBuf.length && timingSafeEqual(candBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

export function otpauthUrl(input: {
  secret: string;
  email: string;
  issuer?: string;
}): string {
  const issuer = encodeURIComponent(input.issuer ?? "Haramain Ride");
  const label = encodeURIComponent(`Haramain Ride:${input.email}`);
  return `otpauth://totp/${label}?secret=${input.secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
