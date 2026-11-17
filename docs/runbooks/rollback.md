# Runbook — Deployment Rollback

## Principles

- Prefer forward fix when safe; roll back when booking/payment integrity is at risk.
- Never enable live payments to “recover” staging.
- Database migrations: prefer expand/contract; avoid destructive down migrations in production without backup.

## App rollback

1. Identify bad deploy SHA via CI / release notes.
2. Redeploy previous known-good image/commit to staging.
3. Confirm `/api/v1/health/ready` and `/api/v1/ops/readiness`.
4. Re-run smoke: login, quote, sandbox webhook path, admin ops page.

## Worker / outbox

1. Pause BullMQ consumers if poison messages amplify errors.
2. Drain or inspect `OutboxEvent` with `processedAt IS NULL`.
3. Resume after fix; confirm `liveDelivery: false` still holds.

## Communication

- Note rollback SHA + time in incident timeline.
- Owner approval required before any production traffic shift (go-live still blocked).
