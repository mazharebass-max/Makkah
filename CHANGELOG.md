# Changelog

## 0.1.0 — 2026-11-17

### Added

- Greenfield monorepo (pnpm + Turborepo) for Haramain Ride production foundation
- NestJS API with Prisma/PostgreSQL, auth, RBAC, catalog stubs, admin stubs, sandbox adapters
- Next.js public web and admin shells using shared `@haramain/ui` design tokens
- Expo-oriented mobile package shells (customer + driver)
- BullMQ worker scaffold
- Docker Compose (Postgres, Redis, MinIO), `.env.example`, `scripts/setup.sh`
- CI workflow: lint, typecheck, tests, migrate, build
- Repo status docs: `PROJECT_STATUS.md`, `DECISIONS.md`

### Notes

- No legacy MVP data migrated (repository was empty aside from README)
- Seed data labeled **DRAFT — OWNER APPROVAL REQUIRED**
