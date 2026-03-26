import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";

import { createTiptapExtensions } from "./tiptap-extensions";

/**
 * 公開サイト用: Tiptap の doc JSON をサーバーで HTML に変換する（本文は CMS からの信頼できる入力前提）。
 */
export function tiptapDocToHtml(doc: unknown): string {
  try {
    const normalized = normalizeEmptyParagraphs(doc);
    return generateHTML(normalized, createTiptapExtensions());
  } catch {
    return "<p class=\"text-zinc-500\">本文を表示できませんでした。</p>";
  }
}

/**
 * Tiptap の doc JSON に存在しうる「空の paragraph（content キー無し）」を
 * HTML 上で確実に描画できるように正規化する。
 *
 * generateHTML が空 paragraph を落としてしまうケースがあるため、
 * 空 paragraph -> hardBreak 1個 を入れた paragraph に置き換える。
 */
function normalizeEmptyParagraphs(doc: unknown): JSONContent {
  if (!doc || typeof doc !== "object" || !("content" in doc)) {
    return doc as JSONContent;
  }

  const root = doc as { content?: unknown[]; type?: unknown };
  if (!Array.isArray(root.content)) return doc as JSONContent;

  const nextContent = root.content.map((node) => {
    if (!node || typeof node !== "object") return node;
    const n = node as { type?: unknown; content?: unknown[] };
    if (n.type === "paragraph" && (!("content" in n) || !Array.isArray(n.content) || n.content.length === 0)) {
      return { ...n, content: [{ type: "hardBreak" }] };
    }
    return node;
  });

  return { ...(doc as object), content: nextContent } as JSONContent;
}
