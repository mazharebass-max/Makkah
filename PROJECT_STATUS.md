# Project Status — Haramain Ride

**Updated:** 2026-11-18  
**Current milestone:** Fresh rebuild **F1** (customer web journey) in progress on top of M0–M8 foundation.  
Go-live **blocked** — compliance gate unsigned. Always `productionGoLive: false`, `regulatoryClearance: false`, `liveOps: false`.

## Honest posture

M0–M8 delivered a solid **sandbox modular monolith**, not a production-cleared product. Fresh rebuild improves the monorepo in place (see Project Context `docs/GAP_ANALYSIS.md`).

## Prior merges (foundation)

| PR | Merge commit |
|---|---|
| #1 M1 | `2c3226c643491f61b134188cbfe9e1e0235c53c8` |
| #2 M2 | `d9065f564f0e7e0eafa402a6b97e47cf11c01bc8` |
| #4 M3 | `ccd1fd50997561c238c65019fe0fbd67edcdf009` |
| #5 M4 | `c350c06857329cf1c69e2af9d5314b0393403326` |
| #6 M5 | `0613259680004cbda1cec46b35b9d33ea17364e9` |
| #7 M6 | `57f79fded09241b06137572138559c4ca1832fe2` |
| #8 M7 | `6787430ca3b281e4084894ccedee1afb138a8ba4` |
| #9 M8 | `77f8cc4b52b9cb2cd5c43657159e19fef936dda8` |
| #10 status | `d618843` (docs) |

## Fresh rebuild plan

| Milestone | Status | Focus |
|---|---|---|
| **F1** | In progress | Fix checkout→`bookingId`, sandbox complete (ledger), confirmation, my trips/trip detail, legal pages, provider registration |
| **F2** | Next | OTP verify, gate `debugCode`, admin MFA scaffold |
| **F3** | Planned | Driver EXCLUDE + DriverShift skeleton |
| **F4** | Planned | Commission/Settlement sandbox models (go-live stays false) |
| **F5** | Planned | Public completeness + FeatureFlag/SystemSetting |
| Go-live | **Blocked** | Owner written sign-offs (`docs/COMPLIANCE_GATE.md`) |

## F1 changes (this branch)

- Web checkout sends `bookingId` to `POST /payments/checkout`
- `POST /payments/sandbox/complete` — authenticated ledger-aware sandbox capture (not live)
- Confirmation, My Trips, Trip Detail, Terms/Privacy/Cancellation, Provider Apply pages
- Session token helper for customer trip views

## Run

```bash
pnpm --filter @haramain/api prisma:migrate && pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
pnpm --filter @haramain/api dev
pnpm --filter @haramain/web dev
./scripts/staging-checklist.sh
```
