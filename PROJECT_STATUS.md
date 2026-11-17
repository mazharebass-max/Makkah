# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M5 (sandbox payments / finance) — ready for review

## Merges

| PR | Merge commit |
|---|---|
| #1 M1 foundation | `2c3226c643491f61b134188cbfe9e1e0235c53c8` |
| #2 M2 search/checkout | `d9065f564f0e7e0eafa402a6b97e47cf11c01bc8` |
| #4 M3 booking/dispatch | `ccd1fd50997561c238c65019fe0fbd67edcdf009` |
| #5 M4 provider compliance | `c350c06857329cf1c69e2af9d5314b0393403326` |

## Milestone progress

| Milestone | Status |
|---|---|
| M0–M4 | Merged to `main` |
| M5 Sandbox payments, refunds, invoices, reconciliation | This PR |
| M6+ | Not started |

## M5 verified

- Booking-linked sandbox checkout (`POST /payments/checkout`)
- Signed webhook (`X-Haramain-Signature`) with gatewayEventId idempotency
- Immutable ledger entries + issued sandbox invoices
- Refund request + `refund.succeeded` webhook
- Finance reconciliation views (API + admin `/finance`)
- 25 API tests passing; never claims live gateway success

## Run

```bash
pnpm --filter @haramain/api prisma:migrate
pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
pnpm --filter @haramain/admin dev  # /finance
```
