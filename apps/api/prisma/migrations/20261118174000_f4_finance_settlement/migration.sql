-- F4: sandbox Commission / ProviderPayable / Settlement (no live payout claims)
CREATE TYPE "CommissionStatus" AS ENUM ('ACCRUED', 'VOID');
CREATE TYPE "PayableStatus" AS ENUM ('OPEN', 'INCLUDED_IN_SETTLEMENT', 'VOID');
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'STATEMENT_ISSUED', 'MARKED_SANDBOX_PAID');

ALTER TYPE "LedgerEntryType" ADD VALUE 'COMMISSION';

CREATE TABLE "Commission" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "chargeAmountHalalas" INTEGER NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "amountHalalas" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "CommissionStatus" NOT NULL DEFAULT 'ACCRUED',
    "draftLabel" TEXT NOT NULL DEFAULT 'DRAFT — OWNER APPROVAL REQUIRED',
    "note" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Commission_bookingId_key" ON "Commission"("bookingId");
CREATE INDEX "Commission_status_createdAt_idx" ON "Commission"("status", "createdAt");
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Settlement" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "statementNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "totalHalalas" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "draftLabel" TEXT NOT NULL DEFAULT 'DRAFT — OWNER APPROVAL REQUIRED — sandbox statement only',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "livePayout" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Settlement_statementNumber_key" ON "Settlement"("statementNumber");
CREATE INDEX "Settlement_providerId_createdAt_idx" ON "Settlement"("providerId", "createdAt");
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProviderPayable" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "settlementId" UUID,
    "amountHalalas" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PayableStatus" NOT NULL DEFAULT 'OPEN',
    "draftLabel" TEXT NOT NULL DEFAULT 'DRAFT — OWNER APPROVAL REQUIRED',
    "note" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderPayable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderPayable_bookingId_key" ON "ProviderPayable"("bookingId");
CREATE INDEX "ProviderPayable_providerId_status_idx" ON "ProviderPayable"("providerId", "status");
CREATE INDEX "ProviderPayable_settlementId_idx" ON "ProviderPayable"("settlementId");
ALTER TABLE "ProviderPayable" ADD CONSTRAINT "ProviderPayable_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderPayable" ADD CONSTRAINT "ProviderPayable_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderPayable" ADD CONSTRAINT "ProviderPayable_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
