import type { RoleCode } from "@haramain/contracts";

export type RequestUser = {
  id: string;
  email: string;
  roles: RoleCode[];
  locale: string;
  providerId?: string | null;
  sessionId?: string;
};

export type JwtAccessPayload = {
  sub: string;
  email: string;
  roles: RoleCode[];
  sid: string;
  typ: "access";
};

/** Short-lived token after password OK when admin MFA is enabled. */
export type JwtMfaPendingPayload = {
  sub: string;
  email: string;
  typ: "mfa_pending";
};
