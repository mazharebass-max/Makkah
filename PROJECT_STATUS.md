# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M4 (provider compliance) — ready for review

## Merges

| PR | Merge commit |
|---|---|
| #1 M1 foundation | `2c3226c643491f61b134188cbfe9e1e0235c53c8` |
| #2 M2 search/checkout | `d9065f564f0e7e0eafa402a6b97e47cf11c01bc8` |
| #4 M3 booking/dispatch | `ccd1fd50997561c238c65019fe0fbd67edcdf009` |

## Milestone progress

| Milestone | Status | Notes |
|---|---|---|
| M0 / M1 / M2 / M3 | Merged to `main` | PRs #1, #2, #4 |
| M4 Provider/driver onboarding + compliance | This PR | Isolation + approval tests pass |
| M5+ | Not started | Finance ledger, mobile, etc. |

## M4 verified

- Provider applicant flow (`POST /providers/applications`) — always `APPLIED`, never auto-approved
- Document upload (sandbox keys only) + expiry job → `EXPIRED`
- Compliance officer review / suspend APIs + admin `/compliance` UI
- Provider isolation: provider B cannot read provider A documents (403)
- Driver onboarding stubs remain inactive / unverified
- 22 API tests passing

## Run

```bash
pnpm --filter @haramain/api prisma:migrate
pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
pnpm --filter @haramain/admin dev
```

## Remaining after M4

Finance ledger/settlements (M5), notifications, mobile apps, live PSP/legal gates.
