# Decisions Log

## D-001 — Greenfield start (2026-11-17)

**Context:** PRD references a Python/SQLite MVP; `mazharebass-max/Makkah` `main` contains only an empty README.  
**Decision:** Treat as greenfield. Do not invent MVP rows or fake migrations from nonexistent `haramain.db`.  
**Consequence:** Gap analysis records absence; production schema starts clean.

## D-002 — Modular monolith API (2026-11-17)

**Decision:** NestJS modular monolith with domain modules; defer microservices.  
**Consequence:** Faster M1 auth/RBAC delivery; clear module boundaries for later extract.

## D-003 — Sandbox adapters until owner credentials (2026-11-17)

**Decision:** SMS, email, and payments use sandbox adapters that never claim live success.  
**Consequence:** Local/CI runnable without PSP/SMS accounts.

## D-004 — Draft operational seed data (2026-11-17)

**Decision:** Routes, categories, and pricing seeds carry `DRAFT — OWNER APPROVAL REQUIRED`. Providers seed as `APPLIED` only.  
**Open:** Owner must approve real fares, zones, legal entity, and verification evidence before production.

## D-005 — Availability source for M2 quotes (2026-11-17)

**Decision:** Availability counts only active **OWNED** vehicles or **THIRD_PARTY** vehicles whose provider status is `APPROVED`. APPLIED providers never contribute inventory. Categories with zero eligible rows return `NO_INVENTORY` (e.g. seeded COACH).  
**Consequence:** Honest empty states; no fabricated live fleet or verified licences.

## D-006 — Draft tax line in quotes (2026-11-17)

**Decision:** Quotes include a `TAX_PLACEHOLDER` line (15% of subtotal) labeled **DRAFT — OWNER APPROVAL REQUIRED**. This is not a ZATCA/VAT determination.  
**Open:** Owner + tax adviser must replace before live invoicing.

## D-007 — Concurrency-safe assignment (2026-11-17)

**Decision:** Use serializable transactions + `pg_advisory_xact_lock` + overlap queries, plus Postgres `EXCLUDE` constraint on vehicle time ranges.  
**Consequence:** Double allocation attempts fail with `VEHICLE_OVERLAP` / `CONCURRENT_DISPATCH`.

## D-008 — Quote soft holds (2026-11-17)

**Decision:** Creating a quote inserts an `AvailabilityHold` that reduces category availability until expiry/release; booking creation excludes the quote’s own hold from the re-check.  
**Consequence:** Checkout inventory is soft-reserved without inventing live fleet.

## D-009 — Human-only provider approval (2026-11-17)

**Decision:** Provider applications always start `APPLIED`. Only `compliance_officer` / `super_admin` may transition to `APPROVED`, and approvals require an explicit review note. Expired documents block approval.  
**Consequence:** No auto-approve path; `verificationClaim` is always false in API responses.

## D-010 — Provider data isolation (2026-11-17)

**Decision:** Object-level ownership via `OwnershipService.assertProviderAccess` on every provider document/driver read.  
**Consequence:** Cross-provider reads return 403; staff compliance roles retain queue access.

## D-011 — Sandbox-only payments with signed webhooks (2026-11-17)

**Decision:** All captures go through `PAYMENT_PROVIDER=sandbox` intents + HMAC-signed webhooks. Booking paid only after verified `payment.succeeded` event; client checkout never marks paid.  
**Consequence:** Retries are idempotent on `gatewayEventId`; APIs always set `liveCapture: false` / `liveGateway: false`.

## D-012 — Immutable ledger entries (2026-11-17)

**Decision:** Charges and refunds append ledger rows (refunds as negative amounts); invoices are issued as DRAFT-labeled sandbox documents pending ZATCA/tax adviser.  
**Consequence:** Finance reconciliation is derived from ledger aggregates, not mutable counters.

## D-013 — Consented location only (2026-11-17)

**Decision:** Drivers must explicitly grant per-booking location consent before samples are accepted; samples expire in 24h. Customers can read latest non-expired sample for owned bookings.  
**Consequence:** No background tracking without consent; aligns with PDPL minimization.

## D-014 — Expo Router mobile shells with CI shims (2026-11-17)

**Decision:** Ship Expo Router source for customer/driver apps; CI typechecks via lightweight RN/Expo shims so native toolchain is not required in GitHub Actions. EAS store builds remain out-of-band.  
**Consequence:** Mobile UX is real code against the shared API; device binaries need local Expo/EAS.

## D-015 — Transactional outbox + sandbox channels (2026-11-17)

**Decision:** All OTP and booking lifecycle notices enqueue `OutboxEvent` rows, then deliver through sandbox SMS/email adapters with `SENT_SANDBOX` status and `liveDelivery: false`. Deduping uses unique `Notification.dedupeKey`.  
**Consequence:** CI/local runnable without Twilio/SendGrid; worker drains via `WORKER_SECRET` — never invents live delivery success.

## D-016 — Support inbox in-platform (2026-11-17)

**Decision:** First-pass support is ticket + message tables with role-gated staff replies; no third-party helpdesk.  
**Consequence:** Customers and support agents share one API surface; escalation tooling remains an owner decision.

## Open owner decisions (from PRD §19)

- Legal entity / TGA / tourism authorizations
- Principal vs agent VAT / ZATCA treatment
- Real routes, fares, cancellation policies
- Payment provider merchant account
- SMS/WhatsApp, maps, hosting, domain
- Launch languages (recommend AR + EN)
- Brand assets and policy pages
