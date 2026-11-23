-- CreateEnum
CREATE TYPE "MarketingPostStatus" AS ENUM ('DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED_SANDBOX', 'CANCELLED');

-- CreateTable
CREATE TABLE "MarketingPost" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "captionEn" TEXT NOT NULL,
    "captionAr" TEXT NOT NULL,
    "visualHint" TEXT,
    "channels" TEXT NOT NULL DEFAULT 'INSTAGRAM,FACEBOOK',
    "status" "MarketingPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "sandboxRef" TEXT,
    "livePublish" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPost_slug_key" ON "MarketingPost"("slug");

-- CreateIndex
CREATE INDEX "MarketingPost_status_scheduledAt_idx" ON "MarketingPost"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "MarketingPost_scheduledAt_idx" ON "MarketingPost"("scheduledAt");
