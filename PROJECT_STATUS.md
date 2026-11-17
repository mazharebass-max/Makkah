# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M7 (notifications / support / analytics) — ready for review

## Merges

| PR | Merge commit |
|---|---|
| #1 M1 | `2c3226c643491f61b134188cbfe9e1e0235c53c8` |
| #2 M2 | `d9065f564f0e7e0eafa402a6b97e47cf11c01bc8` |
| #4 M3 | `ccd1fd50997561c238c65019fe0fbd67edcdf009` |
| #5 M4 | `c350c06857329cf1c69e2af9d5314b0393403326` |
| #6 M5 | `0613259680004cbda1cec46b35b9d33ea17364e9` |
| #7 M6 | `57f79fded09241b06137572138559c4ca1832fe2` |

## Milestone progress

| Milestone | Status |
|---|---|
| M0–M6 | Merged to `main` |
| M7 Notifications, support, analytics | This PR |
| M8+ | Not started |

## M7 verified

- Transactional outbox → Notification / NotificationTemplate (sandbox email/SMS adapters)
- OTP request + booking lifecycle hooks (created / confirmed / status / driver assigned)
- Support tickets + staff inbox; analytics event hooks + admin summary
- BullMQ worker drains outbox via `POST /internal/outbox/process` (WORKER_SECRET)
- Admin pages: `/support`, `/notifications`, `/analytics`
- 31 API tests passing; `liveDelivery: false` / no live channel claims

## Run

```bash
pnpm --filter @haramain/api prisma:migrate && pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
pnpm --filter @haramain/api dev
pnpm --filter @haramain/admin dev
pnpm --filter @haramain/worker dev
```
