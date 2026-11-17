import { z } from "zod";

/** Roles from PRD §2 — keep in sync with seed. */
export const RoleCode = {
  CUSTOMER: "customer",
  FLEET_DISPATCHER: "fleet_dispatcher",
  OWNED_FLEET_MANAGER: "owned_fleet_manager",
  PROVIDER_APPLICANT: "provider_applicant",
  PROVIDER_ADMIN: "provider_admin",
  PROVIDER_DISPATCHER: "provider_dispatcher",
  DRIVER: "driver",
  FINANCE_OFFICER: "finance_officer",
  COMPLIANCE_OFFICER: "compliance_officer",
  SUPPORT_AGENT: "support_agent",
  SUPER_ADMIN: "super_admin",
} as const;

export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

export const ALL_ROLE_CODES = Object.values(RoleCode);

export const ProviderStatus = {
  APPLIED: "APPLIED",
  IN_REVIEW: "IN_REVIEW",
  NEEDS_INFORMATION: "NEEDS_INFORMATION",
  APPROVED: "APPROVED",
  SUSPENDED: "SUSPENDED",
  REJECTED: "REJECTED",
} as const;

export type ProviderStatus =
  (typeof ProviderStatus)[keyof typeof ProviderStatus];

export const FleetOwnership = {
  OWNED: "OWNED",
  THIRD_PARTY: "THIRD_PARTY",
} as const;

export const BookingStatus = {
  DRAFT: "DRAFT",
  QUOTED: "QUOTED",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  ASSIGNMENT_PENDING: "ASSIGNMENT_PENDING",
  ASSIGNED: "ASSIGNED",
  DRIVER_EN_ROUTE: "DRIVER_EN_ROUTE",
  ARRIVED: "ARRIVED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  EXPIRED: "EXPIRED",
  CANCEL_REQUESTED: "CANCEL_REQUESTED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
  DISPUTED: "DISPUTED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
} as const;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  displayName: z.string().min(1).max(120).optional(),
  locale: z.enum(["en", "ar", "ur"]).default("en"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type AuthUser = {
  id: string;
  email: string;
  roles: RoleCode[];
  locale: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

/** Sandbox adapter result — never implies live provider success. */
export type SandboxResult = {
  ok: true;
  mode: "sandbox";
  message: string;
  reference: string;
};
