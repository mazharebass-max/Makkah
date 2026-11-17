# Changelog

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
