# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M8 (staging hardening) — ready for review

## Merges

| PR | Merge commit |
|---|---|
| #1 M1 | `2c3226c643491f61b134188cbfe9e1e0235c53c8` |
| #2 M2 | `d9065f564f0e7e0eafa402a6b97e47cf11c01bc8` |
| #4 M3 | `ccd1fd50997561c238c65019fe0fbd67edcdf009` |
| #5 M4 | `c350c06857329cf1c69e2af9d5314b0393403326` |
| #6 M5 | `0613259680004cbda1cec46b35b9d33ea17364e9` |
| #7 M6 | `57f79fded09241b06137572138559c4ca1832fe2` |
| #8 M7 | `6787430ca3b281e4084894ccedee1afb138a8ba4` |

## Milestone progress

| Milestone | Status |
|---|---|
| M0–M7 | Merged to `main` |
| M8 Staging hardening / security-ops / runbooks | This PR |
| Go-live | **Blocked** — compliance gate unsigned |

## M8 verified

- Security headers + auth/OTP rate limits; readiness vs liveness probes
- Ops APIs: `/ops/readiness`, admin compliance gate + security checklist (always `productionGoLive: false`, `regulatoryClearance: false`)
- Admin **Ops / Gate** page
- Repo docs: `docs/SECURITY.md`, `DEPLOYMENT.md`, `COMPLIANCE_GATE.md`, runbooks
- Scripts: `staging-checklist.sh`, `backup-dry-run.sh`
- CI dependency audit note; API ops tests
- **No** live regulatory clearance or production go-live claims

## Run

```bash
pnpm --filter @haramain/api prisma:migrate && pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
pnpm --filter @haramain/api dev
./scripts/staging-checklist.sh
```
