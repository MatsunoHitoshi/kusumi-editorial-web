import type { JSONContent } from "@tiptap/core";
import type { PageContent } from "@kusumi/content-schema";

function slugifyHeading(text: string, index: number): string {
  const raw = text.trim().replace(/\s+/g, "-").slice(0, 96);
  const base =
    raw.length > 0
      ? raw.replace(/[^\p{L}\p{N}\-_]/gu, "")
      : "";
  const fallback = `section-${index + 1}`;
  return base.length > 0 ? base : fallback;
}

function collectPlainText(content: JSONContent[] | undefined): string {
  if (!content || !Array.isArray(content)) return "";
  let out = "";
  for (const node of content) {
    if (!node || typeof node !== "object") continue;
    const n = node as JSONContent;
    if (n.type === "text" && typeof n.text === "string") {
      out += n.text;
    }
    if (Array.isArray(n.content)) {
      out += collectPlainText(n.content as JSONContent[]);
    }
  }
  return out.trim();
}

export interface H2TocEntry {
  text: string;
  id: string;
}

/**
 * ドキュメント内の見出しレベル2を文書順に抽出し、重複しない id を付与する。
 */
export function extractH2Entries(doc: unknown): H2TocEntry[] {
  if (!doc || typeof doc !== "object" || !("content" in doc)) return [];
  const root = doc as { content?: JSONContent[] };
  const out: H2TocEntry[] = [];
  const usedIds = new Set<string>();

  function walk(nodes: JSONContent[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const n = node as JSONContent;
      if (n.type === "heading" && n.attrs && (n.attrs as { level?: number }).level === 2) {
        const text = collectPlainText(n.content as JSONContent[] | undefined);
        const display = text.length > 0 ? text : `見出し ${out.length + 1}`;
        let id = slugifyHeading(display, out.length);
        let nTry = 2;
        while (usedIds.has(id)) {
          id = `${slugifyHeading(display, out.length)}-${nTry++}`;
        }
        usedIds.add(id);
        out.push({ text: display, id });
      }
      if (Array.isArray(n.content)) {
        walk(n.content as JSONContent[]);
      }
    }
  }

  walk(root.content);
  return out;
}

/**
 * 生成済み HTML の h2 に順に id を付与（既に id がある要素はスキップ）。
 */
export function assignH2IdsFromEntries(html: string, entries: H2TocEntry[]): string {
  let i = 0;
  return html.replace(/<h2(\s[^>]*)?>/gi, (full) => {
    if (/\bid\s*=/i.test(full)) return full;
    if (i >= entries.length) return full;
    const id = entries[i].id;
    i += 1;
    if (full === "<h2>") return `<h2 id="${escapeHtmlAttr(id)}">`;
    return full.replace("<h2", `<h2 id="${escapeHtmlAttr(id)}"`);
  });
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function walkForImage(nodes: JSONContent[] | undefined): string | null {
  if (!nodes) return null;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as JSONContent;
    if (n.type === "image" && n.attrs && typeof (n.attrs as { src?: string }).src === "string") {
      const src = (n.attrs as { src: string }).src;
      if (src) return src;
    }
    if (Array.isArray(n.content)) {
      const found = walkForImage(n.content as JSONContent[]);
      if (found) return found;
    }
  }
  return null;
}

/** Tiptap doc JSON から最初の画像 src を取得 */
export function findFirstImageSrcFromDoc(doc: unknown): string | null {
  if (!doc || typeof doc !== "object" || !("content" in doc)) return null;
  const root = doc as { content?: JSONContent[] };
  return walkForImage(root.content);
}

/** 親スラッグ直下の子ページのみ（`parent/child` で child に `/` なし） */
export function listImmediateChildPages(
  pages: PageContent[],
  parentSlug: string
): PageContent[] {
  const prefix = `${parentSlug}/`;
  return pages.filter((p) => {
    if (!p.slug.startsWith(prefix)) return false;
    const rest = p.slug.slice(prefix.length);
    return rest.length > 0 && !rest.includes("/");
  });
}

export function resolvePageDisplayMode(
  doc: PageContent
): "normal" | "toc" | "portfolio" {
  return doc.pageDisplayMode ?? "normal";
}
