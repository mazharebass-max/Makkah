# Gap Analysis — Haramain Ride vs Production PRD

**Date:** 2026-11-18  
**Repo:** `github.com/mazharebass-max/Makkah` (`main` @ `d618843`)  
**Authoritative PRD:** `docs/HARAMAIN_RIDE_PRODUCTION_PRD.md`  
**Stance:** Prefer improving the existing monorepo. Sandbox adapters only. Never invent live availability, gateway capture, regulatory approval, or verified licences. `productionGoLive` / `regulatoryClearance` / `liveOps` stay **false**.

> Prior store gap analysis (2026-11-17) assumed an empty greenfield repo. That is **stale**. `main` already contains M0–M8 merges. This document replaces that inventory with an honest diff against current code.

---

## Snapshot

| Layer | Reality |
|---|---|
| Monorepo | **Exists** — pnpm + Turborepo, Nest API, Next web/admin, Expo shells, BullMQ worker |
| Domain API | **Solid sandbox** — quote → booking → dispatch → payments ledger → notifications → ops gate |
| Customer web | **Weak** — Home/Search/Checkout/Login only; checkout payment body mismatches API |
| Admin | **Usable thin console** — dispatch, compliance, finance, support, ops (no MFA) |
| Mobile | **API-wired shells** — Expo Router source + CI shims; not store-ready binaries |
| Go-live | **Correctly locked false** — compliance gate unsigned |

---

## EXISTS (solid)

- Identity/RBAC: User, roles, permissions, sessions, JWT + refresh, ownership helpers
- Catalog + draft pricing/quote/holds (`AvailabilityHold`); seeds labeled **DRAFT — OWNER APPROVAL REQUIRED**
- Booking state machine + concurrency-safe dispatch (advisory lock + vehicle GiST `EXCLUDE`)
- Provider apply + compliance review with isolation; no auto-approve; no fabricated licences
- Sandbox payments: intents, HMAC webhooks, charges/refunds, `LedgerEntry`, draft invoices
- Outbox notifications + worker drain (sandbox email/SMS); support tickets; analytics ingest
- Ops readiness / compliance gate / security checklist APIs always report go-live **false**
- Integration tests: RBAC, quote, dispatch, compliance, payments, notifications, ops lock, mobile smoke

## WEAK (partial / sandbox / incomplete)

- **Web checkout bug:** sends `{ amountHalalas }` to `POST /payments/checkout`; API requires `{ bookingId }` — payment step fails validation
- Public site incomplete vs PRD pages (legal, fleet, confirmation, my trips, provider registration, etc.)
- OTP: email request only; returns `debugCode`; **no verify endpoint**; no phone OTP; no admin MFA
- Mobile: functional UI source against API, but no Expo runtime deps / EAS binaries in CI packages
- Worker: outbox drain only (no booking expiry, document expiry, settlement jobs)
- Admin: per-page seed logins hardcoded in UI; thin booking list; no shared session/MFA
- Finance: sandbox recon only — no Commission / Settlement / Payout entities
- Tax: `TAX_PLACEHOLDER` 15% — not a ZATCA determination
- Trip domain approximated by Booking statuses (no separate Trip entity)
- Driver overlap: app-level query only (vehicle EXCLUDE exists; driver EXCLUDE missing)
- Contracts package covers auth/quote schemas — not full OpenAPI surface

## MISSING

**Schema:** ProviderContract, VehicleDocument, VehicleMaintenance, DriverShift, PickupPoint, RouteStop, BookingPassenger, Trip, TripStatusEvent, Commission, ProviderPayable, Settlement, Payout, Promotion, customer Review, FeatureFlag, SystemSetting  

**Product:** full public/legal marketing pages; phone OTP + MFA; live PSP; ZATCA path; provider payouts; feature flags; store-ready mobile; WCAG/E2E suite; staging hosting proof  

**Non-claims (do not invent):** live fleet availability, live payment capture, verified transport licences, regulatory clearance, production go-live

---

## Rebuild plan (improve-in-place)

| Milestone | Focus | Exit gate |
|---|---|---|
| **F1** | Customer web journey — fix checkout→`bookingId`, sandbox complete (ledger-aware), confirmation, my trips/trip detail, legal pages, provider registration; public SEO (metadata EN/AR, robots/sitemap, JSON-LD, noindex private flows) | Typecheck + API tests; screenshots; booking→sandbox pay→trips works; SEO routes present |
| **F2** | Auth completion — OTP verify (email), strip `debugCode` outside test/dev, admin MFA scaffolding (TOTP enroll/verify gated) | Auth tests; no debug OTP in non-dev |
| **F3** | Trip/ops fidelity — driver EXCLUDE constraint, DriverShift skeleton, clearer trip APIs/UI | Concurrent driver-overlap test passes |
| **F4** | Finance skeleton — Commission/ProviderPayable/Settlement models + sandbox statements; keep go-live lock | Finance tests; still `productionGoLive: false` |
| **F5** | Public completeness + FeatureFlag/SystemSetting; PickupPoint for airports; polish RTL/a11y | Responsive screenshots; flags default-off |
| **F6+** | Mobile EAS readiness, worker jobs (expiry), staging hardening deltas — only after F1–F5 | Owner decisions still block live ops |

**Priority now:** **F2** (OTP verify + MFA scaffold) after F1 merge `a1306d6`.

---

## Risks / owner blockers (unchanged)

Legal entity / TGA authorisation, principal-vs-agent VAT, real fares/zones, PSP merchant account, SMS/WhatsApp/maps credentials, brand assets, privacy/terms ownership. Engineering keeps sandbox + DRAFT labels until written sign-off in `COMPLIANCE_GATE.md`.
