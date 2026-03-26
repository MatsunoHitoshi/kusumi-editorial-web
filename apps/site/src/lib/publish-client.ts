import { cache } from "react";
import { z } from "zod";
import { publishSnapshotEnvelopeSchema, type PublishSnapshotEnvelope } from "@kusumi/content-schema";

const envSchema = z.object({
  PUBLISH_API_BASE_URL: z.string().url(),
  PUBLISH_API_TOKEN: z.string().min(1),
  /** CI では yyyyMMddHHmmss。ローカル dev では `latest` で admin の最新タグを参照可能 */
  PUBLISH_VERSION: z.union([z.string().regex(/^\d{14}$/), z.literal("latest")])
});

const emptyEnvelope = (): PublishSnapshotEnvelope =>
  publishSnapshotEnvelopeSchema.parse({
    publishVersion: "19700101000000",
    snapshot: {
      version: "19700101000000",
      generatedAt: new Date(0).toISOString(),
      pages: [],
      articles: [],
      projects: [],
      readings: []
    }
  });

async function fetchPublishSnapshotUncached(): Promise<PublishSnapshotEnvelope> {
  const envCandidate = {
    PUBLISH_API_BASE_URL: process.env.PUBLISH_API_BASE_URL,
    PUBLISH_API_TOKEN: process.env.PUBLISH_API_TOKEN,
    PUBLISH_VERSION: process.env.PUBLISH_VERSION
  };
  const parsed = envSchema.safeParse(envCandidate);
  const isProd = process.env.NODE_ENV === "production";

  if (!parsed.success) {
    if (isProd) {
      throw new Error(
        "本番ビルドには PUBLISH_API_BASE_URL・PUBLISH_API_TOKEN・PUBLISH_VERSION（14桁の版か latest）の設定が必要です。"
      );
    }
    // 開発時のみ: 環境変数が無くても画面の雛形を立ち上げられるようにする
    return emptyEnvelope();
  }

  const env = parsed.data;
  const url = new URL("/api/publish", env.PUBLISH_API_BASE_URL);
  url.searchParams.set("publishVersion", env.PUBLISH_VERSION);

  const response = await fetch(url.toString(), {
    headers: {
      "x-publish-token": env.PUBLISH_API_TOKEN
    },
    ...(isProd ? { next: { revalidate: false } } : { cache: "no-store" })
  });

  if (!response.ok) {
    if (!isProd && response.status === 404) {
      // 開発時: admin 側が未起動、または base URL が別サービスを向いていると 404 になる。
      // その場合はサイトを落とさず、雛形表示で起動できるようにする。
      console.warn(`[site] publish api 404: ${url.toString()} (fallback to empty snapshot)`);
      return emptyEnvelope();
    }
    throw new Error(`publish api error: ${response.status}`);
  }

  const json = await response.json();
  return publishSnapshotEnvelopeSchema.parse(json);
}

const fetchPublishSnapshotCached = cache(fetchPublishSnapshotUncached);

/**
 * production では重複 fetch をまとめる。
 * development では古い結果（404 フォールバック等）がプロセスに張り付かないよう毎回取り直す。
 */
export async function fetchPublishSnapshot(): Promise<PublishSnapshotEnvelope> {
  if (process.env.NODE_ENV !== "production") {
    return fetchPublishSnapshotUncached();
  }
  return fetchPublishSnapshotCached();
}
