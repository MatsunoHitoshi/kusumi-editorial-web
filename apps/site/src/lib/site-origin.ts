/** 公開先のオリジン（OG・sitemap・robots 用）。本番では NEXT_PUBLIC_SITE_URL の設定を推奨 */
export function getSiteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (u && /^https?:\/\//.test(u)) return u;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getMetadataBase(): URL | undefined {
  const o = getSiteOrigin();
  if (o.startsWith("http://localhost") || o.startsWith("http://127.0.0.1")) {
    return undefined;
  }
  try {
    return new URL(o);
  } catch {
    return undefined;
  }
}
