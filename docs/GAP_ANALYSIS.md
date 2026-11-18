# Gap analysis — Haramain Ride vs production PRD

**Updated:** 2026-11-18 (post F4 merge `5864e85`; F5 in progress)  
**Stance:** Prefer improving the existing monorepo. Sandbox adapters only. Never invent live availability, gateway capture, regulatory approval, or verified licences. `productionGoLive` / `regulatoryClearance` / `liveOps` stay **false**.

## Present (high level)

- Nest API + Prisma/Postgres, Next web/admin, Expo mobile shells, worker outbox drain
- Auth/RBAC, quotes/bookings/dispatch, sandbox payments + ledger, OTP verify + MFA scaffold
- Driver GiST EXCLUDE + DriverShift (F3)
- Sandbox Commission / ProviderPayable / Settlement (F4) — no live payouts
- FeatureFlag / SystemSetting / PickupPoint (F5) — flags default off
- Public SEO (metadata EN/AR, robots/sitemap, JSON-LD)

## Remaining gaps (non-critical for F1–F5 exit)

**Schema:** ProviderContract, VehicleDocument, VehicleMaintenance, RouteStop, BookingPassenger, Trip, TripStatusEvent, Payout, Promotion, customer Review  

**Product:** phone OTP; live PSP; ZATCA path; live provider payouts; store-ready mobile / EAS; fuller WCAG/E2E suite; staging hosting proof  

**Non-claims (do not invent):** live fleet availability, live payment capture, live bank payouts, verified transport licences, regulatory clearance, production go-live

**Critical engineering blockers for fresh rebuild F1–F5:** none remaining after F5 — remaining gaps are owner/regulatory/live-ops or later F6+ scope.

---

## Rebuild plan (improve-in-place)

| Milestone | Focus | Exit gate |
|---|---|---|
| **F1** | Customer web journey + public SEO | Merged (#11) |
| **F2** | Auth OTP verify + MFA scaffold | Merged (#12) |
| **F3** | Driver EXCLUDE + DriverShift | Merged (#13) |
| **F4** | Commission/ProviderPayable/Settlement sandbox | Merged (#14) |
| **F5** | FeatureFlag/SystemSetting + PickupPoint + public polish | This branch |
| **F6+** | Mobile EAS, worker jobs, staging deltas | Owner decisions still block live ops |

**Priority now:** Complete F5, then stop unless critical engineering blockers remain.

---

## Risks / owner blockers (unchanged)

Legal entity / TGA authorisation, principal-vs-agent VAT, real fares/zones, PSP merchant account, SMS/WhatsApp/maps credentials, brand assets, privacy/terms ownership. Engineering keeps sandbox + DRAFT labels until written sign-off in `COMPLIANCE_GATE.md`.
