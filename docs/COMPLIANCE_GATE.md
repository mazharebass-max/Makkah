# Compliance Gate — Pre-Launch Checklist

**This document is not a legal opinion.** Owner + licensed counsel must sign off before live operations.  
Engineering APIs expose the same gate with `regulatoryClearance: false` and `productionGoLive: false` until signatures exist.

## Regulatory / licensing

- [ ] Legal entity & commercial registration with permitted activities
- [ ] TGA / transport intermediary & owned-fleet operating authorizations verified
- [ ] Ministry of Tourism requirements (if packaging tourism activities)
- [ ] Airport pickup access (JED / MED) permissions
- [ ] Makkah / Madinah / Hajj-season operational restrictions understood
- [ ] Written evidence of approvals stored with dates and reviewers

## Privacy & consumer

- [ ] PDPL lawful basis, notices, retention, DSR process
- [ ] Cross-border transfer / localization assessment
- [ ] Consumer rights / e-commerce disclosures
- [ ] Privacy & terms published; support hours defined

## Tax & payments

- [ ] Principal vs agent determination for invoicing
- [ ] Saudi VAT treatment & ZATCA e-invoicing phase assessment
- [ ] PSP merchant account (mada / cards / Apple Pay eligibility)
- [ ] Settlement & payout process defined

## Product / ops

- [ ] Real routes, fares, cancellation policies approved (replace DRAFT seeds)
- [ ] Provider contract templates & document requirements
- [ ] Hosting region, domain, SMS/WhatsApp, maps accounts
- [ ] Disaster recovery drill executed; security review; UAT sign-off
- [ ] Written go-live authorization (named signatories + date)

## Engineering stance until signed

- Sandbox adapters only for payments/SMS/email
- No auto-approval of providers or fake verified licences
- No claim of government endorsement or live vehicle availability beyond synthetic inventory labeled draft
- Admin **Ops / Gate** page and `GET /api/v1/ops/readiness` never flip `productionGoLive` / `regulatoryClearance` without process change + owner approval

## M8 API mirrors

- `GET /api/v1/ops/readiness`
- `GET /api/v1/admin/ops/compliance-gate` (staff)
- `GET /api/v1/admin/ops/security-checklist` (staff)
