# Project Status — Haramain Ride

**Updated:** 2026-11-18  
**Current milestone:** Fresh rebuild **F2** (auth OTP verify + admin MFA scaffold).  
Go-live **blocked** — compliance gate unsigned. Always `productionGoLive: false`, `regulatoryClearance: false`, `liveOps: false`.

## Merges

| PR | Merge commit |
|---|---|
| #1–#10 M1–M8 + status | see prior history |
| #11 F1 customer web + SEO | `a1306d67982373f363f39491a65bc1281f946c4b` |

## Fresh rebuild plan

| Milestone | Status | Focus |
|---|---|---|
| **F1** | Merged (#11) | Checkout fix, sandbox complete, trips/legal/provider, public SEO |
| **F2** | In progress | Email OTP verify, gate `debugCode`, admin TOTP MFA scaffold |
| **F3** | Planned | Driver EXCLUDE + DriverShift skeleton |
| **F4** | Planned | Commission/Settlement sandbox models |
| **F5** | Planned | Public completeness + FeatureFlag/SystemSetting |
| Go-live | **Blocked** | Owner written sign-offs (`docs/COMPLIANCE_GATE.md`) |

## F2 changes (this branch)

- Hashed `OtpChallenge` + `POST /auth/otp/verify`
- `debugCode` only in development/test
- Admin TOTP enroll/confirm + MFA-required login step-up
- Security checklist: admin MFA → `IMPLEMENTED_SCAFFOLD`

## Run

```bash
pnpm --filter @haramain/api prisma:migrate && pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
pnpm --filter @haramain/api dev
```
