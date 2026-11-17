/*
  Warnings:

  - Added the required column `scheduledAt` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "luggage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passengers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL;
