-- CreateEnum
CREATE TYPE "PageDisplayMode" AS ENUM ('normal', 'toc', 'portfolio');

-- AlterTable
ALTER TABLE "ContentDocument" ADD COLUMN "pageDisplayMode" "PageDisplayMode";
