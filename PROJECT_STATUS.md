# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M1 exit gate met (local)

## Repository assumption

Greenfield on `mazharebass-max/Makkah`. **No** legacy MVP (`server.py`, `haramain.db`) present. See Project Context `docs/GAP_ANALYSIS.md`.

## Milestone progress

| Milestone | Status | Notes |
|---|---|---|
| M0 Audit / architecture | Done | Greenfield gap + architecture pack in Project `docs/` |
| M1 Monorepo, auth, RBAC, Postgres, CI, design system | Done (local) | Migrations + RBAC tests pass; shells running |
| M2–M8 | Not started | Per PRD |

## Verified locally (M1)

- pnpm monorepo: web, admin, api, worker, mobile shells, `@haramain/ui`, `@haramain/contracts`
- Docker Compose file for Postgres / Redis / MinIO (host Postgres/Redis used in this agent env)
- Prisma migration `m1_init` + synthetic DRAFT seed
- Auth (email/password, JWT + refresh rotation, cookies) + RBAC + ownership stubs
- Anonymous `/admin/*` → 401; wrong role → 403 (vitest suite)
- Sandbox payment/SMS/email adapters (`mode: "sandbox"`)
- Design system tokens + public/admin shells; screenshots in Project `media/m1/`
- GitHub Actions CI workflow

## Run commands

```bash
docker compose up -d   # or local Postgres/Redis
./scripts/setup.sh
pnpm --filter @haramain/api dev
pnpm --filter @haramain/web dev
pnpm --filter @haramain/admin dev
pnpm --filter @haramain/api test
```

## Dev credentials (seed only)

| Email | Password | Role |
|---|---|---|
| customer@haramain.local | CustomerDev!234 | customer |
| admin@haramain.local | AdminDev!23456 | super_admin |
| dispatcher@haramain.local | DispatchDev!234 | fleet_dispatcher |
| compliance@haramain.local | ComplianceDev!2 | compliance_officer |
| finance@haramain.local | FinanceDev!2345 | finance_officer |

## Owner decisions still open

See `DECISIONS.md` and Project `docs/COMPLIANCE_GATE.md`.
