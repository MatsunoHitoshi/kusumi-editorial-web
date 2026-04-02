const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SlugContentType = "page" | "article" | "project" | "reading" | "publication";

/**
 * 固定ページ・記事などの公開スラッグ検証。
 * ネストはスラッシュ区切り（先頭・末尾・連続スラッシュ不可）。
 */
export function validatePublicSlug(
  slug: string,
  contentType?: SlugContentType
): { ok: true } | { ok: false; message: string } {
  const s = slug.trim();
  if (!s) {
    return { ok: false, message: "スラッグを入力してください" };
  }
  if (s.startsWith("/") || s.endsWith("/")) {
    return { ok: false, message: "スラッグの先頭・末尾にスラッシュは使えません" };
  }
  if (s.includes("//")) {
    return { ok: false, message: "スラッグに連続したスラッシュ（//）は使えません" };
  }
  const segments = s.split("/");
  for (const seg of segments) {
    if (!seg) {
      return { ok: false, message: "無効なスラッグです（空のセグメント）" };
    }
    if (!SEGMENT.test(seg)) {
      return {
        ok: false,
        message:
          "各セグメントは半角英小文字・数字・ハイフンのみにしてください（例: publications, my-book）"
      };
    }
  }
  if (contentType === "page" && segments[0] === "publications" && segments.length > 1) {
    return {
      ok: false,
      message:
        "固定ページを publications/… でネストできません。個別URLは「出版物（個別）」種別で登録してください（公開URL は /publications/…）"
    };
  }
  if (contentType === "publication" && segments[0] === "publications") {
    return {
      ok: false,
      message: "先頭の publications/ は不要です。my-book のように /publications より後ろのパスのみ入力してください"
    };
  }

  const reserved = new Set(["articles", "projects", "reading", "admin", "api"]);
  if (reserved.has(segments[0]!)) {
    return {
      ok: false,
      message: `先頭のセグメント「${segments[0]}」は公開サイトの予約パスと競合するため使えません`
    };
  }
  return { ok: true };
}
