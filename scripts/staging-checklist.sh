#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_URL="${API_URL:-http://127.0.0.1:4000/api/v1}"

echo "==> M8 staging checklist (never claims go-live)"
echo "API_URL=$API_URL"

fail=0
check_json() {
  local path="$1"
  local expr="$2"
  local label="$3"
  local body
  body=$(curl -sf "$API_URL$path") || {
    echo "FAIL $label — request failed"
    fail=1
    return
  }
  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert $expr" 2>/dev/null; then
    echo "OK   $label"
  else
    echo "FAIL $label — assertion $expr"
    echo "     body=$body"
    fail=1
  fi
}

check_json "/health" "d.get('status')=='ok' and d.get('liveOps') is False" "liveness liveOps=false"
check_json "/health/ready" "d.get('status')=='ready' and d.get('productionGoLive') is False" "readiness not go-live"
check_json "/ops/readiness" "d.get('productionGoLive') is False and d.get('regulatoryClearance') is False and d.get('liveOps') is False" "ops readiness non-claims"

# Env flags from local .env if present
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ "${PAYMENT_PROVIDER:-sandbox}" != "sandbox" ]]; then
  echo "FAIL PAYMENT_PROVIDER must remain sandbox until signed ($PAYMENT_PROVIDER)"
  fail=1
else
  echo "OK   PAYMENT_PROVIDER=sandbox"
fi

if [[ "${GO_LIVE_LOCKED:-true}" == "false" ]]; then
  echo "WARN GO_LIVE_LOCKED=false — still not a regulatory clearance claim"
else
  echo "OK   GO_LIVE_LOCKED=${GO_LIVE_LOCKED:-true}"
fi

if [[ "$fail" -ne 0 ]]; then
  echo "==> Staging checklist FAILED"
  exit 1
fi
echo "==> Staging checklist PASSED (staging probes only — not production go-live)"
