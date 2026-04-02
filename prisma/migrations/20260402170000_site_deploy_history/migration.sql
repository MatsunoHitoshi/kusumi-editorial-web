-- CreateEnum
CREATE TYPE "SiteDeployStatus" AS ENUM ('queued', 'building', 'deploying', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "SiteDeployHistory" (
    "id" TEXT NOT NULL,
    "publishVersion" TEXT NOT NULL,
    "status" "SiteDeployStatus" NOT NULL DEFAULT 'queued',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "triggeredBy" TEXT,
    "reason" TEXT,
    "githubRunId" TEXT,
    "githubRunAttempt" INTEGER,
    "githubRunUrl" TEXT,
    "buildConclusion" TEXT,
    "deployConclusion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDeployHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteDeployHistory_publishVersion_key" ON "SiteDeployHistory"("publishVersion");

-- CreateIndex
CREATE INDEX "SiteDeployHistory_status_queuedAt_idx" ON "SiteDeployHistory"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "SiteDeployHistory_finishedAt_idx" ON "SiteDeployHistory"("finishedAt");

