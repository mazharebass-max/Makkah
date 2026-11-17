#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Haramain Ride local setup"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# Load env for child processes
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> Installing dependencies (pnpm)"
pnpm install

echo "==> Building shared packages"
pnpm --filter @haramain/contracts build
pnpm --filter @haramain/ui build

echo "==> Prisma generate + migrate + seed"
cd apps/api
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec tsx prisma/seed.ts
cd "$ROOT"

echo "==> Health check (API must be started separately via pnpm --filter @haramain/api dev)"
echo "Setup complete."
echo ""
echo "Next:"
echo "  docker compose up -d          # Postgres, Redis, MinIO (if Docker available)"
echo "  pnpm --filter @haramain/api dev"
echo "  pnpm --filter @haramain/web dev"
echo "  pnpm --filter @haramain/admin dev"
echo ""
echo "Dev credentials (local only):"
echo "  customer@haramain.local / CustomerDev!234"
echo "  admin@haramain.local    / AdminDev!23456"
