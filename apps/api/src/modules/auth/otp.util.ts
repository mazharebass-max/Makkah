import { createHash, timingSafeEqual } from "node:crypto";
import type { Env } from "../../config/env";

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function otpCodesEqual(aHash: string, plainCode: string): boolean {
  const b = hashOtpCode(plainCode);
  const aa = Buffer.from(aHash, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

/** debugCode only for local/test — never staging/production responses. */
export function allowOtpDebugCode(env: Env): boolean {
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return true;
  if (env.APP_ENV === "development" || env.APP_ENV === "test") return true;
  return false;
}

export const ADMIN_MFA_ROLES = new Set([
  "super_admin",
  "fleet_dispatcher",
  "owned_fleet_manager",
  "finance_officer",
  "compliance_officer",
  "support_agent",
]);
