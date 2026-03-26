# Kusumi Editorial Web

東京都立大学 楠見清研究室（エディティングスタジオ）向けのWeb基盤です。  
管理アプリでコンテンツを編集し、公開サイトは静的生成して配信する構成を採用します。

## アーキテクチャ

- `apps/admin`: 管理アプリ（Vercel想定）
  - Next.js (App Router), TailwindCSS, Tiptap
  - Prisma + Supabase Postgres
  - Supabase Storage（画像）
  - 公開反映ボタンから GitHub Actions を dispatch
- `apps/site`: 公開サイト（GitHub Pages想定）
  - Next.js static export
  - 管理アプリの公開APIから `publishVersion` 指定で取得したデータをSSG
- `packages/content-schema`: 共有スキーマと型定義

## 公開サイトのトップページ（原案との対応）

トップの文言・目次は、先生から共有された原案テキストに揃えています。

| 原案 | 実装・参照先 |
|------|----------------|
| `local-resources/ページコンテンツ原案/top.md` | 原案そのもの（1〜2 行目：研究室名・スタジオ名、4〜5 行目：所属、7 行目以降：目次） |
| 上記と同一内容の定数・リンク先 | `apps/site/src/lib/top-page.ts` |

### 原案の構造と画面での使われ方

| `top.md` の位置 | 公開サイトでの表示 |
|-----------------|---------------------|
| 1〜2 行目（楠見清研究室／エディティングスタジオ） | トップの見出し・ヘッダーでのスタジオ名表示の基準 |
| 4〜5 行目（学域・学科の所属表記） | トップページの所属テキスト |
| 7 行目以降（エディティングスタジオ〜コンタクト） | トップの**目次**。各項目はリンクとして別ページへ遷移 |

### 目次リンクと管理画面で用意するページ（`type=page`）

トップの目次は静的に定義されており、次の **`/{slug}` 形式の URL** と一致する固定ページ（`type=page`）を管理アプリで作成・公開してください。`/pages/` は付きません（実装は `apps/site/src/app/[slug]/page.tsx`）。slug を変える場合は `apps/site/src/lib/top-page.ts` の `href` も合わせて更新します。

読書会の「一覧・概要」用の固定ページの slug が `reading` の場合は URL は `/reading` になります。個別の読書会エントリ（`type=reading`）は従来どおり `/reading/{別のslug}` になり、パスが競合しません。

| 目次の表示名（原案どおり） | 公開 URL | 固定ページの slug |
|----------------------------|----------|-------------------|
| エディティングスタジオ | `/about` | `about` |
| 担当教員 | `/faculty` | `faculty` |
| 学生の研究 | `/student-research` | `student-research` |
| プロジェクト | `/project` | `project` |
| 学生成果展 | `/student-exhibition` | `student-exhibition` |
| 出版物 | `/publications` | `publications` |
| 読書会 | `/reading` | `reading` |
| コンタクト | `/contact` | `contact` |

## 主要フロー

1. 管理アプリで draft を保存
2. `admin` ロールが公開反映を実行
3. 管理アプリが GitHub Actions `workflow_dispatch` を呼ぶ（`publishVersion: yyyyMMddHHmmss`）
4. Actions が管理アプリの公開APIから published データを取得して `apps/site` をビルド
5. GitHub Pages へデプロイ

## 実装済みAPI（初期）

- 管理公開API
  - `GET /api/publish?publishVersion=yyyyMMddHHmmss`
  - ヘッダー `x-publish-token` 必須
  - Prismaから `status=published && publishVersion=... && deletedAt=null` のドキュメントを取得して返却（論理削除済みは含めない）
- 管理コンテンツAPI
  - `GET /api/admin/me` ログイン中ユーザー（role 判定用）
  - `GET /api/admin/content` 一覧（論理削除済みは除く）
  - `POST /api/admin/content` 作成（editor以上）
  - `PATCH /api/admin/content/:id` 更新（editor以上・論理削除済みは 410）
  - `DELETE /api/admin/content/:id` 論理削除（`deletedAt` を設定・editor以上。同一 `type/slug/status` は削除後に再利用可）
- ワークフロー起動API
  - `POST /api/workflows/dispatch`（adminのみ）
  - ボディに `confirmPublication: true` 必須（UI の最終確認チェックと同様・誤実行防止）
  - 任意: `reason`（200文字以内・Actions の入力に渡す）
  - `publishVersion` を生成し、公開中ドキュメントへ付与後に Actions dispatch
- 公開対象プレビューAPI
  - `GET /api/admin/publish-preview`（adminのみ・確認ダイアログ用）

## GitHub Actions 最小設計

- Jobs:
  - `build_site`
  - `deploy_pages`
  - `notify_failure`
- Secrets:
  - `ADMIN_DISPATCH_TOKEN`
  - `PUBLISH_API_BASE_URL`
  - `PUBLISH_API_TOKEN`
  - `NOTIFY_WEBHOOK_URL` (任意)
- Dispatch payload:
  - `triggeredBy`
  - `publishVersion` (`yyyyMMddHHmmss`, UTC)
  - `contentTypes`
  - `fullRebuild`
  - `reason`

## Prisma（論理削除・一意制約）

`ContentDocument` に `deletedAt`（論理削除）を追加しています。論理削除されていない行に対してのみ `(type, slug, status)` が一意となる **部分一意インデックス** を `prisma/migrations/20260326120500_init/migration.sql` の末尾で定義しています。

共有・本番データベースでは `npx prisma migrate deploy` を実行してください。ローカル新規は `npx prisma migrate dev` で同じマイグレーションを適用できます。

`prisma migrate dev` が **シャドウ DB** で失敗していた原因は、ALTER のみのマイグレーションで `ContentDocument` テーブルがまだ無いためでした。いまは **`20260326120500_init`** で空の DB からテーブル一式を作成します。

### `migrate dev` で Drift / リセット要求が出るとき

**`db push` で作った DB** と **マイグレーションが期待するスキーマ**（`deletedAt`・部分一意インデックスなど）が違うと、Prisma が *Drift detected* と出し、`prisma migrate reset`（データ全消去）を勧めます。

**開発データを消してよい**場合（いちばん簡単）:

```bash
npx prisma migrate reset
```

（プロンプトで承認後、マイグレーションが最初から適用されます。必要なら `create-admin` を再実行。）

**データを残す**場合: リポジトリの `prisma/scripts/reconcile-db-push-to-migrate.sql` を、接続先 Postgres（例: Supabase ローカル `54322`）に対して実行し、その後 **履歴だけ** 一致させます。

```bash
# 例: psql で実行（接続文字列は環境に合わせる）
psql "$DATABASE_URL" -f prisma/scripts/reconcile-db-push-to-migrate.sql

npx prisma migrate resolve --applied "20260326120500_init"
```

その後は通常どおり `npx prisma migrate dev` が使えます。

手元の DB 固有の差分を確認したい場合は、次でも SQL を出力できます。

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

## 開発メモ

このリポジトリは初期雛形のため、認証実装・Prisma接続・Tiptap本体・ビルド連携の詳細は段階的に実装します。

## Supabase ローカル開発（CLI + Docker）

- `supabase/` は `supabase init` 済みです。
- ルート scripts:
  - `npm run supabase:start`
  - `npm run supabase:status`
  - `npm run supabase:stop`
  - `npm run supabase:db:reset`
- `apps/admin/.env` と `apps/site/.env` はローカルURL前提の値を設定済みです。

### 初回セットアップ手順

1. Docker Desktop を起動
2. `npm run supabase:start`
3. `npm run supabase:status` で `SERVICE_ROLE_KEY` を確認
4. `apps/admin/.env` の `SUPABASE_SERVICE_ROLE_KEY` を埋める
5. バケットを作成（例: `content-images`）
   - Studio: `http://127.0.0.1:54323`
6. `npm --workspace @kusumi/admin run dev` で管理画面起動

### トラブルシュート（No space left on device）

- Docker 側容量不足で `supabase_db_*` が unhealthy になる場合があります。
- 以下でディスク使用量を確認:
  - `docker system df`
- 不要データを削除（影響範囲に注意）:
  - `docker system prune -af --volumes`

## 認証セットアップ（実装済み）

- NextAuth（Credentials）で `/admin` と管理APIを保護
- 必須環境変数（adminアプリ）:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`（本番推奨）
- 初期管理者作成:
  - `apps/admin/.env` に `ADMIN_EMAIL` と `ADMIN_PASSWORD` を書く（スクリプトが先に `.env` を読んでから Prisma を初期化します）。またはシェルで `export` してから
  - `npm --workspace @kusumi/admin run create-admin`
  - `create-admin` で `ECONNREFUSED` になる場合: Supabase を起動したうえで、**上記コマンドはリポジトリルートから実行**してよい（ワークスペースの cwd は `apps/admin` になる）。それでも失敗する場合は `.env` の `DATABASE_URL` が `supabase status` の DB URL と一致しているか確認

## 画像アップロード（実装済み）

- API: `POST /api/admin/upload-image`
- 形式: `multipart/form-data` (`file`, `contentType`)
- `contentType`: `page | article | project | reading`
- バリデーション:
  - MIME: jpeg / png / webp / gif
  - サイズ上限: 8MB
- 保存パス規約: `contentType/yyyy/mm/uuid.ext`
- 必須環境変数:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET`
