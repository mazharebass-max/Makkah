import { BookingStatus } from "@prisma/client";

/** Allowed booking transitions (PRD §6). Actors enforced at call sites. */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["QUOTED", "EXPIRED", "CANCELLED"],
  QUOTED: ["PENDING_PAYMENT", "EXPIRED", "CANCELLED"],
  PENDING_PAYMENT: ["CONFIRMED", "PAYMENT_FAILED", "EXPIRED", "CANCEL_REQUESTED", "CANCELLED"],
  CONFIRMED: ["ASSIGNMENT_PENDING", "CANCEL_REQUESTED", "CANCELLED"],
  ASSIGNMENT_PENDING: ["ASSIGNED", "CANCEL_REQUESTED", "CANCELLED"],
  ASSIGNED: ["DRIVER_EN_ROUTE", "CANCEL_REQUESTED", "CANCELLED", "NO_SHOW"],
  DRIVER_EN_ROUTE: ["ARRIVED", "CANCEL_REQUESTED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["IN_PROGRESS", "NO_SHOW", "CANCEL_REQUESTED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["DISPUTED", "REFUND_PENDING"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED", "EXPIRED"],
  EXPIRED: [],
  CANCEL_REQUESTED: ["CANCELLED", "REFUND_PENDING", "ASSIGNED"],
  CANCELLED: ["REFUND_PENDING", "REFUNDED"],
  NO_SHOW: ["REFUND_PENDING", "REFUNDED", "DISPUTED"],
  DISPUTED: ["REFUND_PENDING", "COMPLETED", "CANCELLED"],
  REFUND_PENDING: ["REFUNDED", "DISPUTED"],
  REFUNDED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (BOOKING_TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus) {
  if (!canTransition(from, to)) {
    const err = new Error(`Illegal booking transition ${from} → ${to}`);
    (err as Error & { code: string }).code = "ILLEGAL_TRANSITION";
    throw err;
  }
}
