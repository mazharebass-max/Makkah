-- Customer + driver live location shares (PDPL-minimized samples).

CREATE TYPE "LocationShareRole" AS ENUM ('DRIVER', 'CUSTOMER');

-- LocationConsent: add role + userId, make driverId optional
ALTER TABLE "LocationConsent" ADD COLUMN "role" "LocationShareRole" NOT NULL DEFAULT 'DRIVER';
ALTER TABLE "LocationConsent" ADD COLUMN "userId" UUID;

UPDATE "LocationConsent" lc
SET "userId" = d."userId"
FROM "Driver" d
WHERE lc."driverId" = d."id" AND lc."userId" IS NULL AND d."userId" IS NOT NULL;

DELETE FROM "LocationConsent" WHERE "userId" IS NULL;

ALTER TABLE "LocationConsent" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "LocationConsent" ALTER COLUMN "driverId" DROP NOT NULL;

DROP INDEX IF EXISTS "LocationConsent_bookingId_driverId_key";
DROP INDEX IF EXISTS "LocationConsent_bookingId_idx";

CREATE UNIQUE INDEX "LocationConsent_bookingId_role_userId_key" ON "LocationConsent"("bookingId", "role", "userId");
CREATE INDEX "LocationConsent_bookingId_role_idx" ON "LocationConsent"("bookingId", "role");

-- LocationSample: add role + userId, make driverId optional
ALTER TABLE "LocationSample" ADD COLUMN "role" "LocationShareRole" NOT NULL DEFAULT 'DRIVER';
ALTER TABLE "LocationSample" ADD COLUMN "userId" UUID;

UPDATE "LocationSample" ls
SET "userId" = d."userId"
FROM "Driver" d
WHERE ls."driverId" = d."id" AND ls."userId" IS NULL AND d."userId" IS NOT NULL;

DELETE FROM "LocationSample" WHERE "userId" IS NULL;

ALTER TABLE "LocationSample" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "LocationSample" ALTER COLUMN "driverId" DROP NOT NULL;

DROP INDEX IF EXISTS "LocationSample_bookingId_recordedAt_idx";
CREATE INDEX "LocationSample_bookingId_role_recordedAt_idx" ON "LocationSample"("bookingId", "role", "recordedAt");
