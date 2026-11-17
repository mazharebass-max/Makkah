# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M2 (public search / quote / checkout UI) — ready for review

## Repository assumption

Greenfield on `mazharebass-max/Makkah`. No legacy MVP data. M1 lives on PR #1; M2 stacks on that branch until merge.

## Milestone progress

| Milestone | Status | Notes |
|---|---|---|
| M0 Audit / architecture | Done | Project `docs/` |
| M1 Monorepo, auth, RBAC, Postgres, CI, design system | Done (PR #1, CI green) | Foundation |
| M2 Public site, search, catalog, quote, checkout UI | Done (this PR) | EN/AR RTL + responsive screenshots in `media/m2/` |
| M3+ | Not started | Booking SM, dispatch concurrency |

## M2 verified

- Launch corridors seeded: JED↔Makkah, Jeddah↔Makkah, Makkah↔Madinah, MED↔Madinah
- `GET /api/v1/search` — capacity + **DB inventory** (owned / approved-provider only); COACH shows honest `NO_INVENTORY`
- `POST /api/v1/quotes` — itemized draft pricing + cancellation policy placeholders
- `POST /api/v1/bookings` — auth required → `PENDING_PAYMENT`; sandbox payment checkout only
- Public web: landing booking widget, search results, checkout (login gate), `?lang=ar` RTL
- Tests: 14 passing (RBAC + pricing math + quote/search/checkout)

## Run commands

```bash
docker compose up -d
./scripts/setup.sh
pnpm --filter @haramain/api prisma:migrate
pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api dev
pnpm --filter @haramain/web dev
pnpm --filter @haramain/api test
```

## Dev credentials (seed)

| Email | Password |
|---|---|
| customer@haramain.local | CustomerDev!234 |
| admin@haramain.local | AdminDev!23456 |

## Remaining for M3

Booking state machine transitions, concurrency-safe dispatch/assignment, owned-fleet ops depth, quote hold/expiry jobs.
