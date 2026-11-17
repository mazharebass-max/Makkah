CREATE TABLE "LocationConsent" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "purpose" TEXT NOT NULL DEFAULT 'active_trip_tracking',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocationSample" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyM" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LocationSample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocationConsent_bookingId_driverId_key" ON "LocationConsent"("bookingId", "driverId");
CREATE INDEX "LocationConsent_bookingId_idx" ON "LocationConsent"("bookingId");
CREATE INDEX "LocationSample_bookingId_recordedAt_idx" ON "LocationSample"("bookingId", "recordedAt");
CREATE INDEX "LocationSample_expiresAt_idx" ON "LocationSample"("expiresAt");

ALTER TABLE "LocationConsent" ADD CONSTRAINT "LocationConsent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationSample" ADD CONSTRAINT "LocationSample_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
