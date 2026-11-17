# Haramain Ride

Premium pilgrim & tourism ground-transport platform (Jeddah · Makkah · Madinah).  
**Hybrid fleet:** owned vehicles + verified third-party providers (human verification required).

> This repository is a **greenfield** production foundation (M1). There is no legacy MVP (`server.py` / `haramain.db`) in `main`. See Project docs / `GAP_ANALYSIS.md`.

## Stack

- **Monorepo:** pnpm + Turborepo
- **API:** NestJS (`apps/api`) + Prisma + PostgreSQL
- **Web / Admin:** Next.js App Router (`apps/web`, `apps/admin`)
- **Mobile:** Expo shells (`apps/mobile-customer`, `apps/mobile-driver`) — native toolchain in M6
- **Worker:** BullMQ (`apps/worker`)
- **Shared:** `@haramain/ui`, `@haramain/contracts`

## Current milestone

**M8** — staging hardening, security/ops checklists, compliance gate mirrors, runbooks.  
**Not** production go-live. See `PROJECT_STATUS.md` and `docs/COMPLIANCE_GATE.md`.

## Quick start

```bash
# Infrastructure (Postgres 16, Redis, MinIO)
docker compose up -d

# One-shot install + migrate + seed
chmod +x scripts/setup.sh
./scripts/setup.sh

# Dev processes (separate terminals or turbo)
pnpm --filter @haramain/api dev      # http://localhost:4000/api/v1
pnpm --filter @haramain/web dev      # http://localhost:3000
pnpm --filter @haramain/admin dev    # http://localhost:3001
```

OpenAPI (dev only): http://localhost:4000/api/docs  
Health: http://localhost:4000/api/v1/health  
Ready: http://localhost:4000/api/v1/health/ready  
Staging readiness: http://localhost:4000/api/v1/ops/readiness  
Admin Ops / Gate: http://localhost:3001/ops

```bash
./scripts/staging-checklist.sh   # requires API up
./scripts/backup-dry-run.sh      # local dump dry-run, not PITR proof
```

### Without Docker

Provide local PostgreSQL + Redis matching `.env.example`, then run `./scripts/setup.sh`.

## Dev credentials (local / CI seed only)

| Email | Password | Roles |
|---|---|---|
| `customer@haramain.local` | `CustomerDev!234` | customer |
| `admin@haramain.local` | `AdminDev!23456` | super_admin |
| `dispatcher@haramain.local` | `DispatchDev!234` | fleet_dispatcher |
| `compliance@haramain.local` | `ComplianceDev!2` | compliance_officer |
| `finance@haramain.local` | `FinanceDev!2345` | finance_officer |
| `support@haramain.local` | `SupportDev!2345` | support_agent |

## Tests

```bash
pnpm --filter @haramain/contracts build
pnpm --filter @haramain/ui build
pnpm --filter @haramain/api prisma:migrate
pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
pnpm typecheck
```

## Important non-claims

- Sandbox SMS / email / payments only — never treated as live success
- Seed routes, fares, and categories are **DRAFT — OWNER APPROVAL REQUIRED**
- No fabricated verified transport licences; providers seed as `APPLIED`
- Not legally cleared for live Saudi operations until compliance gate sign-off

## Status docs

- `PROJECT_STATUS.md` · `CHANGELOG.md` · `DECISIONS.md`
- `docs/SECURITY.md` · `docs/DEPLOYMENT.md` · `docs/COMPLIANCE_GATE.md` · `docs/runbooks/`
- Architecture & PRD companions also in the Project Context store
