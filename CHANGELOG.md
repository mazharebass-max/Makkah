# Changelog

## 0.2.0 — 2026-11-17

### Added (M2)

- Public landing with embedded booking search (EN + AR RTL)
- Route search / availability from PostgreSQL inventory (no invented live fleet)
- Quote engine with itemized draft price lines + cancellation policy placeholders
- Checkout UI with auth gate and sandbox payment step
- API: `GET /search`, `POST /quotes`, `GET /quotes/:id`, `POST /bookings`
- Seed corridors: Jeddah city↔Makkah, MED↔Madinah; COACH category with zero inventory
- Pricing unit tests + quote/search/checkout integration tests

## 0.1.0 — 2026-11-17

### Added (M1)

- Greenfield monorepo (pnpm + Turborepo) for Haramain Ride production foundation
- NestJS API with Prisma/PostgreSQL, auth, RBAC, catalog stubs, admin stubs, sandbox adapters
- Next.js public web and admin shells using shared `@haramain/ui` design tokens
- Expo-oriented mobile package shells (customer + driver)
- BullMQ worker scaffold
- Docker Compose (Postgres, Redis, MinIO), `.env.example`, `scripts/setup.sh`
- CI workflow: lint, typecheck, tests, migrate, build
- Repo status docs: `PROJECT_STATUS.md`, `DECISIONS.md`
