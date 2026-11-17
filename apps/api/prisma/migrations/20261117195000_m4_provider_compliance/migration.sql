-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "suspensionReason" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProviderDocument" ADD COLUMN "draftLabel" TEXT NOT NULL DEFAULT 'DRAFT — OWNER APPROVAL REQUIRED';

-- CreateTable
CREATE TABLE "ProviderReview" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "fromStatus" "ProviderStatus",
    "toStatus" "ProviderStatus" NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "docType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "reviewState" "DocumentReviewState" NOT NULL DEFAULT 'SUBMITTED',
    "draftLabel" TEXT NOT NULL DEFAULT 'DRAFT — OWNER APPROVAL REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderReview_providerId_createdAt_idx" ON "ProviderReview"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "DriverDocument_driverId_idx" ON "DriverDocument"("driverId");

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
