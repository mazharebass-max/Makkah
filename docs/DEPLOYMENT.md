# Deployment — Haramain Ride

## Local

```bash
docker compose up -d
./scripts/setup.sh
pnpm --filter @haramain/api dev
pnpm --filter @haramain/web dev
pnpm --filter @haramain/admin dev
pnpm --filter @haramain/worker dev
```

Probes:

- Liveness: `GET /api/v1/health`
- Readiness: `GET /api/v1/health/ready`
- Staging readiness: `GET /api/v1/ops/readiness`

## CI

`.github/workflows/ci.yml` — install, migrate, seed, lint, typecheck, tests, build, production dependency audit.

## Staging hardening (M8)

| Control | Guidance |
|---|---|
| `APP_ENV` | `staging` |
| Credentials | Separate from local/dev; rotate JWT + webhook + worker secrets |
| Payments / SMS / email | Keep `*_PROVIDER=sandbox` until compliance gate signed |
| `GO_LIVE_LOCKED` | `true` |
| `ALLOW_LIVE_PAYMENTS` / `ALLOW_LIVE_PROVIDERS` | `false` |
| HTTPS | Required on public staging hostname (owner infra) |
| Swagger | Disabled when `APP_ENV=staging` |
| Seed data | Synthetic only — never copy production PII |

Checklist script: `./scripts/staging-checklist.sh`

## Production (blocked)

Production go-live remains **blocked** until written sign-offs in `COMPLIANCE_GATE.md`.  
This repo does **not** claim a live deployment.

## Proposed ops targets (DRAFT — OWNER APPROVAL REQUIRED)

- RPO ≤ 1 hour · RTO ≤ 4 hours
- Prefer Saudi-region hosting pending residency review

## Runbooks

- `docs/runbooks/incident-response.md`
- `docs/runbooks/backup-restore.md`
- `docs/runbooks/rollback.md`
