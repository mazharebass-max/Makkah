-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "ChargeStatus" AS ENUM ('CAPTURED', 'VOIDED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "LedgerEntryType" AS ENUM ('CHARGE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOID');

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amountHalalas" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT',
    "sandboxRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "gatewayEventId" TEXT NOT NULL,
    "intentId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Charge" (
    "id" UUID NOT NULL,
    "intentId" UUID NOT NULL,
    "amountHalalas" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "ChargeStatus" NOT NULL DEFAULT 'CAPTURED',
    "sandboxRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "chargeId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amountHalalas" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "sandboxRef" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerEntry" (
    "id" UUID NOT NULL,
    "bookingId" UUID,
    "paymentIntentId" UUID,
    "refundId" UUID,
    "type" "LedgerEntryType" NOT NULL,
    "amountHalalas" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "totalHalalas" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "draftLabel" TEXT NOT NULL DEFAULT 'DRAFT — OWNER APPROVAL REQUIRED',
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceLine" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amountHalalas" INTEGER NOT NULL,
    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentIntent_sandboxRef_key" ON "PaymentIntent"("sandboxRef");
CREATE UNIQUE INDEX "PaymentIntent_idempotencyKey_key" ON "PaymentIntent"("idempotencyKey");
CREATE INDEX "PaymentIntent_bookingId_idx" ON "PaymentIntent"("bookingId");
CREATE UNIQUE INDEX "PaymentEvent_gatewayEventId_key" ON "PaymentEvent"("gatewayEventId");
CREATE INDEX "PaymentEvent_intentId_type_idx" ON "PaymentEvent"("intentId", "type");
CREATE UNIQUE INDEX "Charge_sandboxRef_key" ON "Charge"("sandboxRef");
CREATE UNIQUE INDEX "Refund_sandboxRef_key" ON "Refund"("sandboxRef");
CREATE INDEX "Refund_bookingId_idx" ON "Refund"("bookingId");
CREATE INDEX "LedgerEntry_bookingId_createdAt_idx" ON "LedgerEntry"("bookingId", "createdAt");
CREATE INDEX "LedgerEntry_type_createdAt_idx" ON "LedgerEntry"("type", "createdAt");
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_bookingId_idx" ON "Invoice"("bookingId");

ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
