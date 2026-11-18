# Changelog

## 0.11.0 — 2026-11-18

### Added (Fresh F3 — driver EXCLUDE + DriverShift)

- Postgres GiST exclusion `booking_assignment_driver_no_overlap` (null driverId excluded)
- `DriverShift` model + admin fleet APIs to list/create draft shifts
- Dispatch checks active driver, shift coverage when shifts exist, and app-level overlap before DB constraint
- Trip list exposes `tripId` alias + assignment window; seed second driver + wide draft shifts
- Concurrent driver-overlap + off-shift tests

### Explicit non-claims

- Draft rosters only; `liveOps` / go-live flags remain false

## 0.10.0 — 2026-11-18

### Added (Fresh F2 — auth OTP + MFA scaffold)

- `POST /api/v1/auth/otp/request` stores hashed `OtpChallenge` and queues sandbox email OTP
- `POST /api/v1/auth/otp/verify` verifies code and marks email identity verified
- `debugCode` returned only in development/test — stripped for staging/production responses
- Admin TOTP MFA scaffold: enroll / confirm / login step-up verify (staff roles only)
- Prisma migration for `OtpChallenge` + `User.mfaTotpSecret` / `mfaEnabledAt`
- Ops security checklist marks admin MFA as `IMPLEMENTED_SCAFFOLD` (not production hardening)

### Explicit non-claims

- Sandbox OTP delivery only; MFA scaffold does not claim production go-live or regulatory clearance
- `productionGoLive` / `regulatoryClearance` / `liveOps` remain false

## 0.9.0 — 2026-11-18

### Added (Fresh F1 — customer web journey + SEO)

- `POST /api/v1/payments/sandbox/complete` — authenticated sandbox capture via ledger path (never live)
- Web confirmation, my trips, trip detail, legal (terms/privacy/cancellation), provider application pages
- Customer session token helper for trip pages
- Payment integration test for sandbox UI complete + idempotent retry
- Public SEO: App Router `generateMetadata` (EN/AR) with Open Graph, Twitter, canonical, hreflang
- `robots.ts` + `sitemap.ts`; Organization / Service / FAQ JSON-LD (no fake ratings or availability)
- Footer + brand home link; `noindex` for login/checkout/confirmation/trips
- `NEXT_PUBLIC_SITE_URL` for canonical/sitemap base

### Fixed

- Web checkout previously sent `{ amountHalalas }` to payments checkout; now sends required `{ bookingId }` and completes sandbox payment

### Explicit non-claims

- Sandbox only — no live gateway capture, no regulatory clearance, no verified licences
- Meta/structured data do not claim live licensed operations

## 0.8.0 — 2026-11-17

### Added (M8)

- Staging readiness / compliance gate / security checklist APIs (non-clearance)
- Security headers, auth/OTP rate limits, liveness + readiness probes
- Admin Ops / Gate UI; staging + backup dry-run scripts
- Repo security/deployment/compliance docs and ops runbooks
- CI dependency audit step (advisory)

### Explicit non-claims

- No regulatory clearance, pen-test completion, or production go-live

## 0.7.0 — 2026-11-17


### Added (M7)

- Transactional notification outbox with sandbox email/SMS delivery
- OTP request endpoint (sandbox debug code only)
- Support tickets inbox + staff status updates
- Analytics event hooks and admin summary
- BullMQ worker outbox drain via worker secret
- Admin UI: support, notifications, analytics

## 0.6.0 — 2026-11-17


### Added (M6)

- Customer Expo Router app (auth, trips history, trip timeline/location)
- Driver Expo Router app (assignments, status updates, consented location)
- LocationConsent + LocationSample APIs with PDPL-minded retention
- End-to-end mobile booking/trip smoke tests

## 0.5.0 — 2026-11-17

### Added (M5)

- Sandbox payments, signed webhooks, refunds, invoices, finance UI

## 0.4.0 — 2026-11-17

### Added (M4)

- Provider onboarding and compliance isolation

## 0.3.0 — 2026-11-17

### Added (M3)

- Booking state machine, holds, concurrency-safe dispatch

## 0.2.0 — 2026-11-17

### Added (M2)

- Public search, quotes, checkout UI

## 0.1.0 — 2026-11-17

### Added (M1)

- Monorepo foundation, auth/RBAC, design system, CI
