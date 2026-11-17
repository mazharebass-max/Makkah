import { describe, expect, it } from "vitest";
import { BookingStatus } from "@prisma/client";
import {
  assertTransition,
  canTransition,
} from "../src/modules/bookings/booking-state.machine";

describe("booking state machine", () => {
  it("allows happy-path transitions", () => {
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED)).toBe(true);
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.ASSIGNMENT_PENDING)).toBe(true);
    expect(canTransition(BookingStatus.ASSIGNMENT_PENDING, BookingStatus.ASSIGNED)).toBe(true);
    expect(canTransition(BookingStatus.ASSIGNED, BookingStatus.DRIVER_EN_ROUTE)).toBe(true);
    expect(canTransition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED)).toBe(true);
  });

  it("rejects illegal jumps", () => {
    expect(canTransition(BookingStatus.DRAFT, BookingStatus.COMPLETED)).toBe(false);
    expect(() =>
      assertTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.ASSIGNED),
    ).toThrow(/Illegal booking transition/);
  });
});
