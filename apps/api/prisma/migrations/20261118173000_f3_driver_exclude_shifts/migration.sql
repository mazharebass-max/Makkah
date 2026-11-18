-- F3: driver assignment exclusion + DriverShift skeleton
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "DriverShift" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "draftLabel" TEXT NOT NULL DEFAULT 'DRAFT — OWNER APPROVAL REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverShift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriverShift_driverId_startsAt_endsAt_idx" ON "DriverShift"("driverId", "startsAt", "endsAt");

ALTER TABLE "DriverShift" ADD CONSTRAINT "DriverShift_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exclusion constraint: prevent overlapping driver assignments (null driverId excluded)
ALTER TABLE "BookingAssignment"
  ADD CONSTRAINT booking_assignment_driver_no_overlap
  EXCLUDE USING gist (
    "driverId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("driverId" IS NOT NULL);
