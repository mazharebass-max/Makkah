-- AlterTable
ALTER TABLE "BookingAssignment" ADD COLUMN     "reason" TEXT;

-- CreateTable
CREATE TABLE "AvailabilityHold" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "vehicleId" UUID,
    "quoteId" UUID,
    "bookingId" UUID,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityHold_categoryId_startsAt_endsAt_idx" ON "AvailabilityHold"("categoryId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AvailabilityHold_expiresAt_releasedAt_idx" ON "AvailabilityHold"("expiresAt", "releasedAt");

-- CreateIndex
CREATE INDEX "AvailabilityHold_quoteId_idx" ON "AvailabilityHold"("quoteId");

-- CreateIndex
CREATE INDEX "AvailabilityHold_bookingId_idx" ON "AvailabilityHold"("bookingId");

-- Exclusion constraint: prevent overlapping vehicle assignments (concurrency safety net)
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingAssignment"
  ADD CONSTRAINT booking_assignment_vehicle_no_overlap
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("vehicleId" IS NOT NULL);
