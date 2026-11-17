# Project Status — Haramain Ride

**Updated:** 2026-11-17  
**Current milestone:** M6 (mobile apps) — ready for review

## Merges

| PR | Merge commit |
|---|---|
| #1 M1 | `2c3226c643491f61b134188cbfe9e1e0235c53c8` |
| #2 M2 | `d9065f564f0e7e0eafa402a6b97e47cf11c01bc8` |
| #4 M3 | `ccd1fd50997561c238c65019fe0fbd67edcdf009` |
| #5 M4 | `c350c06857329cf1c69e2af9d5314b0393403326` |
| #6 M5 | `0613259680004cbda1cec46b35b9d33ea17364e9` |

## Milestone progress

| Milestone | Status |
|---|---|
| M0–M5 | Merged to `main` |
| M6 Customer + driver Expo apps | This PR |
| M7+ | Not started |

## M6 verified

- Expo Router customer app: login, tabs (Home/Trips/Help/Account), trip detail + location view
- Expo Router driver app: login, assigned trips, status transitions, consented location share
- APIs: `GET /bookings`, `GET /driver/trips`, location consent/sample endpoints
- Location samples require consent + active trip; 24h expiry note
- Mobile smoke test (booking → pay → assign → driver location → customer read)
- 26 API tests passing; no live gateway/availability claims

## Run

```bash
pnpm --filter @haramain/api prisma:migrate && pnpm --filter @haramain/api prisma:seed
pnpm --filter @haramain/api test
# Native: configure Expo toolchain, then `pnpm --filter @haramain/mobile-customer dev`
```
