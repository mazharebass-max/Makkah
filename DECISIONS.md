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

## D-017 — Go-live hard lock until written sign-offs (2026-11-17)

**Decision:** `GO_LIVE_LOCKED=true` by default; `ALLOW_LIVE_PAYMENTS` / `ALLOW_LIVE_PROVIDERS` default false. Ops readiness APIs always report `productionGoLive: false` and `regulatoryClearance: false` until a future process change backed by owner signatures in `COMPLIANCE_GATE.md`.  
**Consequence:** Staging can be hardened and probed without inventing legal clearance or live ops.

## D-018 — Baseline security headers + rate limits in-app (2026-11-17)

**Decision:** Ship CSP/frame/nosniff headers and Redis/memory auth rate limits in the API for M8; treat CDN/WAF, secrets manager, admin MFA, and external pen test as owner/partner follow-ups.  
**Consequence:** CI-verifiable baseline without claiming full ASVS or production hardening complete.

## D-022 — Driver exclusion + DriverShift skeleton (2026-11-18)

**Decision:** Add Postgres GiST `EXCLUDE` on `BookingAssignment.driverId` + time range (WHERE driverId IS NOT NULL), mirroring the vehicle constraint. Introduce `DriverShift` as a draft roster; when any shifts exist for a driver, assignment requires a covering shift. Trip APIs keep Booking as the trip entity (`tripId` alias) rather than adding a separate Trip table yet.  
**Consequence:** Concurrent double-driver allocation fails at DB layer; rosters stay DRAFT until owner approval.

## D-021 — Email OTP verify + gated debugCode; admin TOTP scaffold (2026-11-18)

**Decision:** Persist hashed OTP challenges; verify via `POST /auth/otp/verify`. Expose `debugCode` only when `NODE_ENV`/`APP_ENV` is development or test. Admin/staff roles may enroll TOTP; enabled MFA forces login step-up via `mfaToken`. Secrets stored in DB for local scaffold only — production must use KMS. Ops checklist status `IMPLEMENTED_SCAFFOLD`, not a go-live claim.  
**Consequence:** Checkout/auth can complete email verification in sandbox; staging responses never leak OTP codes.

## D-020 — Public SEO via App Router metadata (2026-11-18)

**Decision:** Use Next.js Metadata API / `generateMetadata` with EN+AR copy, `robots.ts`, `sitemap.ts`, and JSON-LD for Organization/Service/FAQ. Index public marketing/legal/search/provider-apply; `noindex` login, checkout, confirmation, and trips. Meta and structured data must not claim live licensing, ratings, or invented availability. Canonical base from `NEXT_PUBLIC_SITE_URL`.  
**Consequence:** Search-friendly public surface without fabricating go-live claims.

## D-019 — Authenticated sandbox payment complete for web (2026-11-18)

**Context:** Browser checkout cannot hold `PAYMENT_WEBHOOK_SECRET`. Legacy `POST /payments/sandbox/confirm` flipped booking status without the payments ledger.  
**Decision:** Add `POST /payments/sandbox/complete` that ownership-checks the customer, finds the sandbox intent, and runs the same `handleWebhook(payment.succeeded)` path. Disabled if `ALLOW_LIVE_PAYMENTS` or go-live is unlocked.  
**Consequence:** Web confirmation can show a paid sandbox booking with invoice/ledger consistency; never a live capture claim.

## D-023 — Sandbox commission & settlement statements (2026-11-18)

**Context:** PRD requires Commission / ProviderPayable / Settlement before live ops; owner has not approved rates or payout rails.  
**Decision:** Accrue DRAFT commission at 1500 bps on sandbox capture; create ProviderPayable when a third-party `BookingAssignment.providerId` exists; issue Settlement statements with `livePayout: false`. `MARKED_SANDBOX_PAID` is bookkeeping only. No `Payout` entity and no bank transfer path until owner sign-off.  
**Consequence:** Finance officers can reconcile sandbox statements without inventing live payouts; go-live lock unchanged.

## D-024 — Feature flags default off; env remains go-live authority (2026-11-18)

**Context:** PRD lists FeatureFlag / SystemSetting / PickupPoint for product completeness.  
**Decision:** Persist FeatureFlag rows defaulting to `enabled: false`. Enabling `allow_live_payments` / `allow_live_providers` is refused while `GO_LIVE_LOCKED` (or live env flags off). Env vars remain the hard go-live gate. PickupPoint seeds are draft airport/hotel meeting points only.  
**Consequence:** Operators can preview toggles without inventing production clearance; public SEO surfaces stay honest.
## Open owner decisions (from PRD §19)

- Legal entity / TGA / tourism authorizations
- Principal vs agent VAT / ZATCA treatment
- Real routes, fares, cancellation policies
- Payment provider merchant account
- SMS/WhatsApp, maps, hosting, domain
- Launch languages (recommend AR + EN)
- Brand assets and policy pages
- Commission rate / settlement calendar / payout rails
