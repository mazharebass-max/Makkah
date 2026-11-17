# Security — Haramain Ride

## Baseline (implemented)

- Password hashing: Argon2id
- JWT access short-lived; refresh rotation + session revocation
- RBAC on privileged routes; object-level ownership checks
- **No unauthenticated admin APIs**
- Input validation (`class-validator` whitelist / forbid unknown)
- Parameterized queries via Prisma
- Auth + OTP rate limits (Redis with in-memory fallback)
- API security headers (CSP baseline, `X-Frame-Options`, `nosniff`, …)
- Payment webhook HMAC verification (sandbox)
- Audit events for privileged actions
- Swagger disabled when `APP_ENV=staging` or `NODE_ENV=production`
- `GO_LIVE_LOCKED=true` by default; live payment/provider flags default off

## Explicit non-claims

- **Not** a completed OWASP ASVS audit or penetration test
- **Not** production go-live or regulatory clearance
- Sandbox SMS / email / payments only unless owner unlocks after sign-off
- Header `X-Haramain-Live-Ops: false` on API responses

## Pre-launch (owner / security partner)

- TLS + CDN/WAF on staging/production domains
- Secrets manager (no long-lived secrets in env files)
- Admin MFA
- Dependency + container scanning on a cadence
- External pen test with written report
- PDPL/privacy review — see `COMPLIANCE_GATE.md`

## Testing

- RBAC / ownership suites
- M8 ops readiness asserts `productionGoLive: false` and `regulatoryClearance: false`
- CI `pnpm audit --prod` (advisory; does not claim zero CVEs forever)
