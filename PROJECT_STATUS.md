# Project Status — Haramain Ride

**Updated:** 2026-11-18  
**Current milestone:** Fresh rebuild **F5** (FeatureFlag / SystemSetting / PickupPoint + public polish).  
Go-live **blocked** — compliance gate unsigned. Always `productionGoLive: false`, `regulatoryClearance: false`, `liveOps: false`.

## Merges

| PR | Merge commit |
|---|---|
| #11 F1 customer web + SEO | `a1306d67982373f363f39491a65bc1281f946c4b` |
| #12 F2 OTP + MFA scaffold | `713b27ae0492ef5782a5702b240a9a27a3584799` |
| #13 F3 driver EXCLUDE + DriverShift | `e669a1001cc65fc458138962012594854009db86` |
| #14 F4 sandbox Commission / Settlement | `5864e85fe36fe7ac518f774c77a9b479ecb146f0` |

## Fresh rebuild plan

| Milestone | Status | Focus |
|---|---|---|
| **F1** | Merged (#11) | Checkout fix, trips/legal/provider, public SEO |
| **F2** | Merged (#12) | Email OTP verify, gate `debugCode`, admin TOTP scaffold |
| **F3** | Merged (#13) | Driver EXCLUDE + DriverShift + trip list clarity |
| **F4** | Merged (#14) | Commission/ProviderPayable/Settlement sandbox statements |
| **F5** | In progress | FeatureFlag/SystemSetting + PickupPoint + public polish |
| Go-live | **Blocked** | Owner written sign-offs (`docs/COMPLIANCE_GATE.md`) |

## F5 changes (this branch)

- Prisma `FeatureFlag`, `SystemSetting`, `PickupPoint` (+ airport terminal seeds)
- Public `GET /feature-flags` (default off) and `GET /pickup-points`
- Admin settings APIs; refuse enabling live_* flags while go-live locked
- Home page pickup-points section + FAQ/nav i18n polish (SEO preserved)

## Run

```bash
pnpm --filter @haramain/api prisma:migrate && pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
```
