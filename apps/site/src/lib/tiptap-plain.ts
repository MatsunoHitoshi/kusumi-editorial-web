/** Tiptap/ProseMirror doc JSON からプレーンテキストの段落をざっくり抽出する（閲覧用の最小実装） */
export function tiptapToPlainParagraphs(doc: unknown): string[] {
  if (!doc || typeof doc !== "object" || !("content" in doc)) {
    return [];
  }
  const root = doc as { content?: unknown[] };
  if (!Array.isArray(root.content)) {
    return [];
  }
  const lines: string[] = [];
  for (const node of root.content) {
    const line = blockText(node).trim();
    if (line.length > 0) {
      lines.push(line);
    }
  }
  return lines;
}

function blockText(node: unknown): string {
  if (!node || typeof node !== "object") {
    return "";
  }
  const n = node as { type?: string; text?: string; content?: unknown[]; attrs?: { level?: number } };
  if (typeof n.text === "string") {
    return n.text;
  }
  if (Array.isArray(n.content)) {
    const inner = n.content.map(blockText).join("");
    if (n.type === "heading" && typeof n.attrs?.level === "number") {
      return `${"#".repeat(n.attrs.level)} ${inner}`;
    }
    return inner;
  }
  return "";
}
