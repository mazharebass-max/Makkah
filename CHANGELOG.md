# Changelog

## 0.3.0 — 2026-11-17

### Added (M3)

- Booking state machine with enforced transitions
- Availability holds for quotes/checkout
- Concurrency-safe dispatch (`POST /admin/bookings/:id/assign`) with advisory locks + exclusion constraint
- Sandbox payment confirm (`POST /payments/sandbox/confirm`) → assignment queue
- Owned-fleet admin APIs (`/admin/fleet/vehicles`, drivers, activate)
- Admin dispatch UI; booking/dispatch tests

## 0.2.0 — 2026-11-17

### Added (M2)

- Public landing with embedded booking search (EN + AR RTL)
- Route search / availability from PostgreSQL inventory
- Quote engine with itemized draft price lines + cancellation policy placeholders
- Checkout UI with auth gate and sandbox payment step

## 0.1.0 — 2026-11-17

### Added (M1)

- Greenfield monorepo foundation, auth/RBAC, design system, CI
