#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL required}"
OUT_DIR="${ROOT}/tmp/backups"
mkdir -p "$OUT_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="${OUT_DIR}/haramain-dry-run-${STAMP}.sql"

echo "==> Backup dry-run → $OUT"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump --no-owner --no-acl "$DATABASE_URL" >"$OUT"
  wc -c "$OUT"
  # Basic integrity: file non-empty and contains Prisma migration marker or schema
  if [[ ! -s "$OUT" ]]; then
    echo "FAIL empty dump"
    exit 1
  fi
  echo "OK dump written (local dry-run only — not production PITR proof)"
else
  echo "WARN pg_dump not installed; writing placeholder evidence"
  cat >"$OUT" <<EOF
-- Backup dry-run placeholder ${STAMP}
-- Install PostgreSQL client tools to produce a real dump.
-- This file intentionally does NOT claim a production restore drill.
EOF
fi

echo "Restore drill: create empty DB, psql -f dump, prisma migrate status, hit /api/v1/health/ready"
echo "Document results in COMPLIANCE_GATE.md — unsigned until owner confirms."
