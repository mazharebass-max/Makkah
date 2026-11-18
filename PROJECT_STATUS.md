# Project Status — Haramain Ride

**Updated:** 2026-11-18  
**Current milestone:** Fresh rebuild **F3** (driver EXCLUDE + DriverShift).  
Go-live **blocked** — compliance gate unsigned. Always `productionGoLive: false`, `regulatoryClearance: false`, `liveOps: false`.

## Merges

| PR | Merge commit |
|---|---|
| #11 F1 customer web + SEO | `a1306d67982373f363f39491a65bc1281f946c4b` |
| #12 F2 OTP + MFA scaffold | `713b27ae0492ef5782a5702b240a9a27a3584799` |

## Fresh rebuild plan

| Milestone | Status | Focus |
|---|---|---|
| **F1** | Merged (#11) | Checkout fix, trips/legal/provider, public SEO |
| **F2** | Merged (#12) | Email OTP verify, gate `debugCode`, admin TOTP scaffold |
| **F3** | In progress | Driver EXCLUDE + DriverShift + trip list clarity |
| **F4** | Planned | Commission/Settlement sandbox models |
| **F5** | Planned | Public completeness + FeatureFlag/SystemSetting |
| Go-live | **Blocked** | Owner written sign-offs (`docs/COMPLIANCE_GATE.md`) |

## F3 changes (this branch)

- Driver GiST exclusion constraint
- `DriverShift` + fleet shift APIs (draft-labeled)
- Dispatch: off-shift + driver overlap (app + DB)
- `tripId` / assignment window on trip summaries

## Run

```bash
pnpm --filter @haramain/api prisma:migrate && pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
```
