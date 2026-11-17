# Runbook — Incident Response

**Scope:** Staging / pre-production incidents. Not a claim of 24×7 SOC coverage.

## Severity (draft)

| Sev | Examples | Initial response |
|---|---|---|
| SEV-1 | Data exposure, auth bypass, payment ledger corruption | Page owner; freeze deploys; revoke sessions |
| SEV-2 | Booking/dispatch outage, Redis down affecting workers | Stabilize; status note; root-cause |
| SEV-3 | Degraded admin UX, non-critical job lag | Ticket; next business hours |

## Immediate steps

1. Confirm blast radius via logs + `/api/v1/health` + `/api/v1/health/ready` + `/api/v1/ops/readiness`.
2. If credential leak suspected: rotate `JWT_*`, `PAYMENT_WEBHOOK_SECRET`, `WORKER_SECRET`; invalidate sessions.
3. Keep `PAYMENT_PROVIDER=sandbox` — do not “fix” by enabling live PSP mid-incident.
4. Capture timeline in audit notes; notify owner for SEV-1/2.
5. After stabilize: postmortem (what / impact / fix / follow-ups). Do not claim regulatory breach notification complete without counsel.

## Contacts

- Engineering on-call: **DRAFT — OWNER APPROVAL REQUIRED**
- Legal / privacy: **DRAFT — OWNER APPROVAL REQUIRED**
