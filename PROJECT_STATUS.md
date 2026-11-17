# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M3 (booking SM + dispatch) — ready for review

## Merges

| PR | Merge commit |
|---|---|
| #1 M1 foundation | `2c3226c643491f61b134188cbfe9e1e0235c53c8` |
| #2 M2 search/checkout | `d9065f564f0e7e0eafa402a6b97e47cf11c01bc8` |

## Milestone progress

| Milestone | Status | Notes |
|---|---|---|
| M0 / M1 / M2 | Merged to `main` | PRs #1 and #2 |
| M3 Booking SM, holds, concurrency-safe dispatch, owned fleet | This PR | Tests green locally |
| M4+ | Not started | Provider compliance, etc. |

## M3 verified

- Booking state machine with allowed transitions
- Availability holds on quotes (count against inventory; self-hold excluded at checkout)
- Postgres exclusion constraint + serializable tx + advisory locks on assign
- Sandbox payment confirm → `CONFIRMED` → `ASSIGNMENT_PENDING` (never live gateway)
- Owned-fleet list/activate APIs + admin dispatch UI
- 18 API tests passing

## Run

```bash
./scripts/setup.sh
pnpm --filter @haramain/api prisma:migrate
pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api dev
pnpm --filter @haramain/admin dev
pnpm --filter @haramain/api test
```

## Remaining after M3

Provider/driver compliance verification (M4), full finance ledger (M5), mobile apps (M6).
