# Runbook — Backup & Restore

**Proposed targets (DRAFT — OWNER APPROVAL REQUIRED):** RPO ≤ 1 hour · RTO ≤ 4 hours.

## Local / staging dry-run

```bash
./scripts/backup-dry-run.sh
```

This script dumps schema+data from the configured `DATABASE_URL` into `./tmp/backups/` and verifies `pg_restore --list` (or `psql` file readability). It does **not** prove production PITR.

## Production expectations (owner infra)

- Managed Postgres with PITR / encrypted automated backups
- Restore drill on a disposable instance before go-live
- Object storage (MinIO/S3) versioning for uploaded compliance docs
- Never restore production customer data into shared staging without anonymization

## Verification checklist

- [ ] Backup artifact created
- [ ] Restore into empty database succeeds
- [ ] `prisma migrate status` clean after restore
- [ ] Auth login + health readiness pass
- [ ] Document drill date / operator (unsigned until owner confirms)
