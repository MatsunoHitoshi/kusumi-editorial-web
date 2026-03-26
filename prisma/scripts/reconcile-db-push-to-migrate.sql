-- db push 由来の DB を、マイグレーション 20260326120500_init と同等のスキーマへ寄せる（データは保持）
-- 実行後: npx prisma migrate resolve --applied "20260326120500_init"

ALTER TABLE "ContentDocument" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- 旧 Prisma の @@unique([type, slug, status])（名前は環境で異なる場合あり）
DROP INDEX IF EXISTS "ContentDocument_type_slug_status_key";

-- 部分一意（論理削除行は一意制約の対象外）
DROP INDEX IF EXISTS "ContentDocument_type_slug_status_active_key";
CREATE UNIQUE INDEX "ContentDocument_type_slug_status_active_key"
  ON "ContentDocument" ("type", "slug", "status")
  WHERE "deletedAt" IS NULL;

-- マイグレーション init と同じ非一意インデックス（未作成なら追加）
CREATE INDEX IF NOT EXISTS "ContentDocument_type_slug_status_idx" ON "ContentDocument" ("type", "slug", "status");
CREATE INDEX IF NOT EXISTS "ContentDocument_status_publishVersion_idx" ON "ContentDocument" ("status", "publishVersion");
