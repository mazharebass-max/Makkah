# Decisions Log

## D-001 — Greenfield start (2026-11-17)

**Context:** PRD references a Python/SQLite MVP; `mazharebass-max/Makkah` `main` contains only an empty README.  
**Decision:** Treat as greenfield. Do not invent MVP rows or fake migrations from nonexistent `haramain.db`.  
**Consequence:** Gap analysis records absence; production schema starts clean.

## D-002 — Modular monolith API (2026-11-17)

**Decision:** NestJS modular monolith with domain modules; defer microservices.  
**Consequence:** Faster M1 auth/RBAC delivery; clear module boundaries for later extract.

## D-003 — Sandbox adapters until owner credentials (2026-11-17)

**Decision:** SMS, email, and payments use sandbox adapters that never claim live success.  
**Consequence:** Local/CI runnable without PSP/SMS accounts.

## D-004 — Draft operational seed data (2026-11-17)

**Decision:** Routes, categories, and pricing seeds carry `DRAFT — OWNER APPROVAL REQUIRED`. Providers seed as `APPLIED` only.  
**Open:** Owner must approve real fares, zones, legal entity, and verification evidence before production.

## D-005 — Availability source for M2 quotes (2026-11-17)

**Decision:** Availability counts only active **OWNED** vehicles or **THIRD_PARTY** vehicles whose provider status is `APPROVED`. APPLIED providers never contribute inventory. Categories with zero eligible rows return `NO_INVENTORY` (e.g. seeded COACH).  
**Consequence:** Honest empty states; no fabricated live fleet or verified licences.

## D-006 — Draft tax line in quotes (2026-11-17)

**Decision:** Quotes include a `TAX_PLACEHOLDER` line (15% of subtotal) labeled **DRAFT — OWNER APPROVAL REQUIRED**. This is not a ZATCA/VAT determination.  
**Open:** Owner + tax adviser must replace before live invoicing.

## Open owner decisions (from PRD §19)

- Legal entity / TGA / tourism authorizations
- Principal vs agent VAT / ZATCA treatment
- Real routes, fares, cancellation policies
- Payment provider merchant account
- SMS/WhatsApp, maps, hosting, domain
- Launch languages (recommend AR + EN)
- Brand assets and policy pages
