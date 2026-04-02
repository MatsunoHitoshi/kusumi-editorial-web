export type PreviewContentType = "page" | "article" | "project" | "reading" | "publication";
export type PreviewStatus = "draft" | "published";
export type PreviewPageDisplayMode = "normal" | "toc" | "portfolio";

export interface ContentPreviewPayload {
  type: PreviewContentType;
  slug: string;
  title: string;
  status: PreviewStatus;
  body: Record<string, unknown>;
  selectedId: string | null;
  updatedAt: string;
  /** 固定ページのみ */
  pageDisplayMode?: PreviewPageDisplayMode;
}

export const CONTENT_PREVIEW_STORAGE_KEY = "kusumi:admin:content-preview";

export function publicPath(type: PreviewContentType, slug: string): string {
  if (type === "page") return `/${slug}`;
  if (type === "article") return `/articles/${slug}`;
  if (type === "project") return `/projects/${slug}`;
  if (type === "reading") return `/reading/${slug}`;
  return `/publications/${slug}`;
}
