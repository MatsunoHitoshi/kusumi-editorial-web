"use client";

import { useEffect, useMemo, useState } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import {
  CONTENT_PREVIEW_STORAGE_KEY,
  type ContentPreviewPayload,
  publicPath
} from "@/lib/live-preview";

type ContentType = "page" | "article" | "project" | "reading" | "publication";
type Status = "draft" | "published";
type SortMode = "updated_desc" | "created_desc" | "title_asc" | "title_desc" | "status_then_updated_desc";

interface ContentSummary {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  status: Status;
  publishVersion?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContentDetail extends ContentSummary {
  body: Record<string, unknown>;
  pageDisplayMode?: "normal" | "toc" | "portfolio" | null;
}

const DEFAULT_DOC: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph" }]
};

const fixedPageOptions: readonly { slug: string; label: string }[] = [
  { slug: "about", label: "エディティングスタジオ" },
  { slug: "faculty", label: "担当教員" },
  { slug: "student-research", label: "学生の研究" },
  { slug: "project", label: "プロジェクト" },
  { slug: "student-exhibition", label: "学生成果展" },
  { slug: "publications", label: "出版物" },
  { slug: "reading", label: "読書会" },
  { slug: "contact", label: "コンタクト" }
] as const;

const defaultFixedPageSlug = fixedPageOptions[0].slug;
const defaultFixedPageTitle = fixedPageOptions[0].label;

const contentTypeLabel: Record<ContentType, string> = {
  page: "固定ページ（トップ目次）",
  article: "記事",
  project: "プロジェクト（個別）",
  reading: "読書会（個別）",
  publication: "出版物（個別）"
};

const statusLabel: Record<Status, string> = {
  draft: "下書き",
  published: "公開"
};

function statusBadgeClass(status: Status): string {
  return status === "published"
    ? "rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800"
    : "rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600";
}

function formatApiErrorPayload(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "issues" in data) {
    const issues = (data as { issues?: Array<{ path: (string | number)[]; message: string }> }).issues;
    if (Array.isArray(issues) && issues.length > 0) {
      return issues.map((i) => `${i.path.join(".") || "payload"}: ${i.message}`).join(" / ");
    }
  }
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

function splitSlugSegments(slug: string): string[] {
  return slug.split("/").map((s) => s.trim()).filter(Boolean);
}

function sortContentItems(items: ContentSummary[], mode: SortMode): ContentSummary[] {
  const toTime = (iso: string): number => Date.parse(iso);
  const withTieBreak = (a: ContentSummary, b: ContentSummary, cmp: number) =>
    cmp !== 0 ? cmp : a.id.localeCompare(b.id, "en");

  const copy = [...items];
  switch (mode) {
    case "created_desc":
      return copy.sort((a, b) => withTieBreak(a, b, toTime(b.createdAt) - toTime(a.createdAt)));
    case "title_asc":
      return copy.sort((a, b) =>
        withTieBreak(a, b, a.title.localeCompare(b.title, "ja", { sensitivity: "base" }))
      );
    case "title_desc":
      return copy.sort((a, b) =>
        withTieBreak(a, b, b.title.localeCompare(a.title, "ja", { sensitivity: "base" }))
      );
    case "status_then_updated_desc": {
      return copy.sort((a, b) => {
        const pubA = a.status === "published" ? 1 : 0;
        const pubB = b.status === "published" ? 1 : 0;
        const byStatus = pubB - pubA;
        return byStatus !== 0 ? byStatus : withTieBreak(a, b, toTime(b.updatedAt) - toTime(a.updatedAt));
      });
    }
    case "updated_desc":
    default:
      return copy.sort((a, b) => withTieBreak(a, b, toTime(b.updatedAt) - toTime(a.updatedAt)));
  }
}

interface SlugTreeNode {
  key: string;
  label: string;
  children: Record<string, SlugTreeNode>;
  leafItems: ContentSummary[];
  subtreeCount: number;
}

interface PortfolioChildItem {
  id: string;
  slug: string;
  title: string;
  portfolioOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

function buildSlugTree(items: ContentSummary[]): SlugTreeNode {
  const root: SlugTreeNode = {
    key: "__root__",
    label: "",
    children: {},
    leafItems: [],
    subtreeCount: 0
  };

  for (const item of items) {
    const segs = splitSlugSegments(item.slug);
    let node = root;
    node.subtreeCount += 1;
    for (const seg of segs) {
      if (!node.children[seg]) {
        node.children[seg] = {
          key: `${node.key}/${seg}`,
          label: seg,
          children: {},
          leafItems: [],
          subtreeCount: 0
        };
      }
      node = node.children[seg];
      node.subtreeCount += 1;
    }
    node.leafItems.push(item);
  }

  return root;
}

export function ContentManager() {
  const [items, setItems] = useState<ContentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isListOpen, setIsListOpen] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");
  const [portfolioChildren, setPortfolioChildren] = useState<PortfolioChildItem[]>([]);
  const [portfolioChildrenLoading, setPortfolioChildrenLoading] = useState(false);
  const [portfolioChildrenError, setPortfolioChildrenError] = useState<string | null>(null);
  const [portfolioDraftOrder, setPortfolioDraftOrder] = useState<PortfolioChildItem[]>([]);
  const [portfolioOrderDirty, setPortfolioOrderDirty] = useState(false);
  const [portfolioDraggingId, setPortfolioDraggingId] = useState<string | null>(null);
  const [portfolioSaving, setPortfolioSaving] = useState(false);

  const [publicationItems, setPublicationItems] = useState<PortfolioChildItem[]>([]);
  const [publicationItemsLoading, setPublicationItemsLoading] = useState(false);
  const [publicationItemsError, setPublicationItemsError] = useState<string | null>(null);
  const [publicationDraftOrder, setPublicationDraftOrder] = useState<PortfolioChildItem[]>([]);
  const [publicationOrderDirty, setPublicationOrderDirty] = useState(false);
  const [publicationDraggingId, setPublicationDraggingId] = useState<string | null>(null);
  const [publicationSaving, setPublicationSaving] = useState(false);
  const [form, setForm] = useState<{
    type: ContentType;
    slug: string;
    title: string;
    status: Status;
    body: Record<string, unknown>;
    pageDisplayMode: "normal" | "toc" | "portfolio";
  }>({
    type: "page",
    slug: defaultFixedPageSlug,
    title: defaultFixedPageTitle,
    status: "draft",
    body: DEFAULT_DOC,
    pageDisplayMode: "normal"
  });

  const previewSlug = form.slug.trim();
  const showDraftPreview =
    selectedId === null &&
    previewSlug.length > 0 &&
    form.title.trim().length > 0 &&
    // 既に確定済み（作成済み）なら、一覧表示の方を優先してプレビューは出さない
    !items.some((i) => i.type === form.type && i.slug === previewSlug && i.status === form.status);

  const fixedPageOption =
    form.type === "page" ? fixedPageOptions.find((p) => p.slug === form.slug) ?? null : null;
  const fixedPageSelectValue = fixedPageOption ? fixedPageOption.slug : "__custom__";

  function setContentIdQuery(contentId: string | null) {
    const url = new URL(window.location.href);
    if (contentId) {
      url.searchParams.set("contentId", contentId);
    } else {
      url.searchParams.delete("contentId");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function loadList() {
    const response = await fetch("/api/admin/content");
    if (!response.ok) return;
    const data = (await response.json()) as { items: ContentSummary[] };
    setItems(data.items);
  }

  async function loadDetail(id: string): Promise<boolean> {
    const response = await fetch(`/api/admin/content/${id}`);
    if (!response.ok) return false;
    const data = (await response.json()) as ContentDetail;
    setSelectedId(data.id);
    setForm({
      type: data.type,
      slug: data.slug,
      title: data.title,
      status: data.status,
      body: data.body ?? DEFAULT_DOC,
      pageDisplayMode: data.pageDisplayMode ?? "normal"
    });
    return true;
  }

  useEffect(() => {
    void (async () => {
      await loadList();
      const contentId = new URL(window.location.href).searchParams.get("contentId");
      if (!contentId) return;
      const ok = await loadDetail(contentId);
      if (!ok) setContentIdQuery(null);
    })();
  }, []);

  useEffect(() => {
    const payload: ContentPreviewPayload = {
      type: form.type,
      slug: form.slug,
      title: form.title,
      status: form.status,
      body: form.body,
      selectedId,
      updatedAt: new Date().toISOString(),
      pageDisplayMode: form.type === "page" ? form.pageDisplayMode : undefined
    };
    try {
      window.localStorage.setItem(CONTENT_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore localStorage errors
    }
  }, [form, selectedId]);

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  function openPreview() {
    const payload: ContentPreviewPayload = {
      type: form.type,
      slug: form.slug,
      title: form.title,
      status: form.status,
      body: form.body,
      selectedId,
      updatedAt: new Date().toISOString(),
      pageDisplayMode: form.type === "page" ? form.pageDisplayMode : undefined
    };
    try {
      window.localStorage.setItem(CONTENT_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore localStorage errors
    }
    window.open("/admin/preview", "_blank", "noopener,noreferrer");
  }

  function sortPortfolioChildren(list: PortfolioChildItem[]): PortfolioChildItem[] {
    return [...list].sort((a, b) => {
      const ao = a.portfolioOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.portfolioOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.title.localeCompare(b.title, "ja", { sensitivity: "base" });
    });
  }

  const sortedItems = useMemo(() => sortContentItems(items, sortMode), [items, sortMode]);

  const typeOrder: ContentType[] = ["page", "article", "project", "reading", "publication"];

  const itemsByType = useMemo(() => {
    const out = {} as Record<ContentType, ContentSummary[]>;
    for (const t of typeOrder) out[t] = [];
    for (const item of sortedItems) {
      out[item.type].push(item);
    }
    return out;
  }, [sortedItems]);

  const treesByType = useMemo(() => {
    const out = {} as Partial<Record<ContentType, SlugTreeNode>>;
    for (const t of typeOrder) {
      const list = itemsByType[t];
      if (list.length > 0) out[t] = buildSlugTree(list);
    }
    return out;
  }, [itemsByType]);

  useEffect(() => {
    const shouldLoad =
      selectedId !== null &&
      form.type === "page" &&
      form.pageDisplayMode === "portfolio" &&
      form.slug.trim() !== "publications" &&
      form.slug.trim().length > 0;

    if (!shouldLoad) {
      setPortfolioChildren([]);
      setPortfolioDraftOrder([]);
      setPortfolioOrderDirty(false);
      setPortfolioChildrenError(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setPortfolioChildrenLoading(true);
      setPortfolioChildrenError(null);
      try {
        const res = await fetch(
          `/api/admin/content/portfolio-children?parentSlug=${encodeURIComponent(form.slug)}&status=${form.status}`
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const json = (await res.json()) as { items: PortfolioChildItem[] };
        const sorted = sortPortfolioChildren(json.items);
        if (cancelled) return;
        setPortfolioChildren(json.items);
        setPortfolioDraftOrder(sorted);
        setPortfolioOrderDirty(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "読み込みに失敗しました";
        setPortfolioChildrenError(msg);
      } finally {
        if (cancelled) return;
        setPortfolioChildrenLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, form.type, form.pageDisplayMode, form.slug, form.status]);

  useEffect(() => {
    const shouldLoad =
      selectedId !== null &&
      form.type === "page" &&
      form.pageDisplayMode === "portfolio" &&
      form.slug.trim() === "publications";

    if (!shouldLoad) {
      setPublicationItems([]);
      setPublicationDraftOrder([]);
      setPublicationOrderDirty(false);
      setPublicationItemsError(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setPublicationItemsLoading(true);
      setPublicationItemsError(null);
      try {
        const res = await fetch(
          `/api/admin/content/publications-portfolio-items?status=${form.status}`
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const json = (await res.json()) as { items: PortfolioChildItem[] };
        const sorted = sortPortfolioChildren(json.items);
        if (cancelled) return;
        setPublicationItems(json.items);
        setPublicationDraftOrder(sorted);
        setPublicationOrderDirty(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "読み込みに失敗しました";
        setPublicationItemsError(msg);
      } finally {
        if (cancelled) return;
        setPublicationItemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, form.type, form.pageDisplayMode, form.slug, form.status]);

  function renderLeafItem(item: ContentSummary) {
    return (
      <button
        key={item.id}
        className={`w-full rounded border px-3 py-2 text-left text-sm ${selectedId === item.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
          }`}
        onClick={() => {
          setContentIdQuery(item.id);
          void loadDetail(item.id);
        }}
      >
        <div className="font-medium">{item.title}</div>
        <div className="text-xs text-zinc-600">{publicPath(item.type, item.slug)}</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5">{contentTypeLabel[item.type]}</span>
          <span className={statusBadgeClass(item.status)}>{statusLabel[item.status]}</span>
        </div>
      </button>
    );
  }

  function renderSlugNode(node: SlugTreeNode, depth: number) {
    const childKeys = Object.keys(node.children).sort((a, b) =>
      a.localeCompare(b, "ja", { sensitivity: "base" })
    );

    return (
      <details key={node.key} open={depth === 1} className="group">
        <summary className="cursor-pointer list-none rounded border border-transparent px-1.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono">{node.label}</span>
            <span className="text-[11px] text-zinc-500">({node.subtreeCount})</span>
          </div>
        </summary>
        <div className="space-y-2 pl-2 ml-3 border-l border-zinc-700">
          {node.leafItems.map((leaf) => renderLeafItem(leaf))}
          {childKeys.map((k) => renderSlugNode(node.children[k]!, depth + 1))}
        </div>
      </details>
    );
  }

  function resetPortfolioOrder() {
    setPortfolioDraftOrder(sortPortfolioChildren(portfolioChildren));
    setPortfolioOrderDirty(false);
    setPortfolioDraggingId(null);
  }

  function movePortfolioItem(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    const from = portfolioDraftOrder.findIndex((x) => x.id === dragId);
    const to = portfolioDraftOrder.findIndex((x) => x.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...portfolioDraftOrder];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setPortfolioDraftOrder(next);
    setPortfolioOrderDirty(true);
  }

  async function savePortfolioOrder() {
    if (!portfolioOrderDirty || portfolioSaving) return;
    if (portfolioDraftOrder.length === 0) return;

    setPortfolioSaving(true);
    setActionError(null);
    try {
      // 1..N を連番で割り当て、未設定を末尾ルールから外して明示的な順序にします。
      const ordered = [...portfolioDraftOrder];
      const updates = ordered.map((child, index) =>
        fetch(`/api/admin/content/${child.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portfolioOrder: index + 1 })
        }).then(async (res) => {
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
        })
      );
      await Promise.all(updates);

      showToast("success", "配下ページの表示順を保存しました");

      // ローカル側も保存した順序（portfolioOrder）を反映して整合性を取ります。
      const nextItems = ordered.map((child, index) => ({
        ...child,
        portfolioOrder: index + 1
      }));
      setPortfolioChildrenError(null);
      setPortfolioChildren(nextItems);
      setPortfolioDraftOrder(nextItems);
      setPortfolioOrderDirty(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存に失敗しました";
      setPortfolioChildrenError(msg);
      setActionError(msg);
    } finally {
      setPortfolioSaving(false);
    }
  }

  function resetPublicationOrder() {
    setPublicationDraftOrder(sortPortfolioChildren(publicationItems));
    setPublicationOrderDirty(false);
    setPublicationDraggingId(null);
  }

  function movePublicationItem(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    const from = publicationDraftOrder.findIndex((x) => x.id === dragId);
    const to = publicationDraftOrder.findIndex((x) => x.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...publicationDraftOrder];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setPublicationDraftOrder(next);
    setPublicationOrderDirty(true);
  }

  async function savePublicationOrder() {
    if (!publicationOrderDirty || publicationSaving) return;
    if (publicationDraftOrder.length === 0) return;

    setPublicationSaving(true);
    setActionError(null);
    try {
      const ordered = [...publicationDraftOrder];
      const updates = ordered.map((child, index) =>
        fetch(`/api/admin/content/${child.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portfolioOrder: index + 1 })
        }).then(async (res) => {
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
        })
      );
      await Promise.all(updates);

      showToast("success", "出版物の表示順を保存しました");

      const nextItems = ordered.map((child, index) => ({
        ...child,
        portfolioOrder: index + 1
      }));
      setPublicationItemsError(null);
      setPublicationItems(nextItems);
      setPublicationDraftOrder(nextItems);
      setPublicationOrderDirty(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存に失敗しました";
      setPublicationItemsError(msg);
      setActionError(msg);
    } finally {
      setPublicationSaving(false);
    }
  }

  return (
    <>
      {toast && (
        <div
          className={`fixed left-1/2 bottom-4 z-50 -translate-x-1/2 rounded border px-3 py-2 text-sm shadow-sm ${toast.kind === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
            }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
      <div className={`grid gap-8 ${isListOpen ? "md:grid-cols-[320px_1fr]" : "grid-cols-1"}`}>
        {isListOpen ? (
          <aside className="rounded border border-zinc-200 p-4 flex flex-col gap-2">
            <div className="mb-3 flex flex-col gap-1">
              <h2 className="text-lg font-semibold">記事・ページ一覧</h2>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-2 py-1 text-sm"
                  onClick={() => {
                    setSelectedId(null);
                    setContentIdQuery(null);
                    setForm({
                      type: "page",
                      slug: defaultFixedPageSlug,
                      title: defaultFixedPageTitle,
                      status: "draft",
                      body: DEFAULT_DOC,
                      pageDisplayMode: "normal"
                    });
                  }}
                >
                  新規作成
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                  onClick={() => setIsListOpen(false)}
                >
                  一覧を閉じる
                </button>
              </div>
              <label className="block text-xs text-zinc-600">
                並び順
                <select
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="updated_desc">更新日時（新しい順）</option>
                  <option value="created_desc">作成日時（新しい順）</option>
                  <option value="title_asc">タイトル（A→Z）</option>
                  <option value="title_desc">タイトル（Z→A）</option>
                  <option value="status_then_updated_desc">公開状態（公開→下書き）</option>
                </select>
              </label>
            </div>
            <div className="space-y-2">
              {showDraftPreview && (
                <div>
                  <div className="w-full rounded border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 opacity-50">
                    <div className="font-medium">{form.title}</div>
                    <div className="text-xs text-zinc-600">{publicPath(form.type, previewSlug)}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5">{contentTypeLabel[form.type]}</span>
                      <span className={statusBadgeClass(form.status)}>{statusLabel[form.status]}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">(未保存プレビュー)</div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {typeOrder
                  .filter((t) => itemsByType[t].length > 0)
                  .map((t) => {
                    const tree = treesByType[t];
                    if (!tree) return null;
                    const firstSegKeys = Object.keys(tree.children).sort((a, b) =>
                      a.localeCompare(b, "ja", { sensitivity: "base" })
                    );
                    return (
                      <details
                        key={t}
                        open={t === "page"}
                        className="rounded border border-zinc-100 bg-zinc-50 px-2 py-1"
                      >
                        <summary className="cursor-pointer list-none text-sm font-medium text-zinc-800">
                          <div className="flex items-center justify-between gap-2">
                            <span>{contentTypeLabel[t]}</span>
                            <span className="text-xs text-zinc-500">{itemsByType[t].length}</span>
                          </div>
                        </summary>
                        <div className="mt-2 space-y-2 pl-2">
                          {firstSegKeys.map((k) => renderSlugNode(tree.children[k]!, 1))}
                        </div>
                      </details>
                    );
                  })}
              </div>
            </div>
          </aside>
        ) : null}

        <section className="rounded border border-zinc-200 p-4">
          {!isListOpen ? (
            <div className="mb-4">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => setIsListOpen(true)}
              >
                記事・ページ一覧を開く
              </button>
            </div>
          ) : null}
          <h2 className="text-lg font-semibold">{selectedId ? "記事・ページを編集" : "記事・ページを作成"}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            タイトルと本文を入力し、必要に応じて公開状態を切り替えてください。
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              コンテンツ種別
              <select
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => {
                    const nextType = event.target.value as ContentType;
                    if (nextType === "page") {
                      return {
                        ...prev,
                        type: nextType,
                        slug: defaultFixedPageSlug,
                        title: prev.title.trim().length === 0 ? defaultFixedPageTitle : prev.title,
                        pageDisplayMode: "normal"
                      };
                    }
                    return {
                      ...prev,
                      type: nextType,
                      slug: "",
                      pageDisplayMode: "normal"
                    };
                  })
                }
              >
                <option value="page">トップ目次の固定ページ</option>
                <option value="article">記事</option>
                <option value="project">プロジェクト（個別）</option>
                <option value="reading">読書会（個別）</option>
                <option value="publication">出版物（個別）</option>
              </select>
            </label>
            <label className="text-sm">
              公開状態
              <select
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as Status }))}
              >
                <option value="draft">下書き（非公開）</option>
                <option value="published">公開</option>
              </select>
            </label>
            {form.type === "page" ? (
              <>
                <label className="text-sm">
                  固定ページ（トップ目次）
                  <select
                    className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                    value={fixedPageSelectValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => {
                        if (value === "__custom__") {
                          return { ...prev, slug: "" };
                        }
                        const opt = fixedPageOptions.find((p) => p.slug === value) ?? null;
                        return {
                          ...prev,
                          slug: value,
                          title:
                            prev.title.trim().length === 0 && opt
                              ? opt.label
                              : prev.title
                        };
                      });
                    }}
                  >
                    {fixedPageOptions.map((opt) => (
                      <option key={opt.slug} value={opt.slug}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__custom__">カスタム（手入力）</option>
                  </select>

                  {fixedPageSelectValue === "__custom__" ? (
                    <div className="mt-3 space-y-2">
                      <input
                        className="w-full rounded border border-zinc-300 px-3 py-2"
                        value={form.slug}
                        placeholder="例: about または parent/child-page"
                        onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                      />
                      <p className="text-xs text-zinc-500">
                        ネストURLは <span className="font-mono">親スラッグ/子識別子</span>（半角英小文字・数字・ハイフン）。出版物の個別ページは「出版物（個別）」種別で{" "}
                        <span className="font-mono">/publications/…</span> として登録してください（<span className="font-mono">publications/…</span>{" "}
                        で固定ページを作ることはできません）。
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">公開URL: /{form.slug}</p>
                  )}
                </label>
                <label className="block text-sm">
                  表示モード
                  <select
                    className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                    value={form.pageDisplayMode}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        pageDisplayMode: event.target.value as "normal" | "toc" | "portfolio"
                      }))
                    }
                  >
                    <option value="normal">通常（本文のみ）</option>
                    <option value="toc">目次（見出し2でサイド/横目次）</option>
                    <option value="portfolio">ポートフォリオ（直下の子ページをサムネイル一覧）</option>
                  </select>
                  <p className="mt-1 text-xs text-zinc-500">
                    ポートフォリオは、スラッグが「{form.slug.trim() || "親"}/…」の1階層だけの子ページを自動表示します。
                  </p>
                  {selectedId !== null && form.slug.trim().length > 0 && form.pageDisplayMode === "portfolio" ? (
                    form.slug.trim() === "publications" ? (
                      <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-medium text-zinc-800">出版物の表示順</h3>
                          {publicationOrderDirty ? (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">未保存</span>
                          ) : (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-zinc-600">確定</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-600">
                          公開URL（/publications/...）で表示される一覧順をドラッグで並べ替えできます。保存するとこのステータスの出版物に反映されます（未公開の変更はサイト側に出ません）。
                        </p>

                        {publicationItemsError ? (
                          <p className="mt-2 text-sm text-red-700">{publicationItemsError}</p>
                        ) : null}

                        {publicationItemsLoading ? (
                          <p className="mt-2 text-sm text-zinc-500">読み込み中…</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {publicationDraftOrder.length === 0 ? (
                              <p className="text-sm text-zinc-500">対象の出版物がありません。</p>
                            ) : (
                              publicationDraftOrder.map((child, index) => {
                                const isDragging = publicationDraggingId === child.id;
                                return (
                                  <div
                                    key={child.id}
                                    draggable
                                    onDragStart={() => setPublicationDraggingId(child.id)}
                                    onDragEnd={() => setPublicationDraggingId(null)}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (!publicationDraggingId) return;
                                      movePublicationItem(publicationDraggingId, child.id);
                                    }}
                                    className={`flex items-center justify-between gap-3 rounded border border-zinc-200 bg-white px-3 py-2 ${isDragging ? "opacity-50" : ""
                                      }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <span className="cursor-grab select-none text-zinc-400" aria-hidden>
                                        ☰
                                      </span>
                                      <div className="min-w-0">
                                        <div className="truncate font-medium">{child.title}</div>
                                        <div className="text-xs text-zinc-500">{`/publications/${child.slug}`}</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-zinc-500">#{index + 1}</div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={!publicationOrderDirty || publicationSaving || publicationItemsLoading}
                            className="rounded bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
                            onClick={() => void savePublicationOrder()}
                          >
                            {publicationSaving ? "保存中…" : "並び順を保存"}
                          </button>
                          <button
                            type="button"
                            disabled={!publicationOrderDirty || publicationSaving || publicationItemsLoading}
                            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            onClick={resetPublicationOrder}
                          >
                            リセット
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-medium text-zinc-800">配下ページの表示順</h3>
                          {portfolioOrderDirty ? (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">未保存</span>
                          ) : (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-zinc-600">確定</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-600">
                          子ページをドラッグで並べ替えできます。保存するとこの親のポートフォリオに反映されます（未公開の変更はサイト側に出ません）。
                        </p>

                        {portfolioChildrenError ? (
                          <p className="mt-2 text-sm text-red-700">{portfolioChildrenError}</p>
                        ) : null}

                        {portfolioChildrenLoading ? (
                          <p className="mt-2 text-sm text-zinc-500">読み込み中…</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {portfolioDraftOrder.length === 0 ? (
                              <p className="text-sm text-zinc-500">直下に子ページがありません。</p>
                            ) : (
                              portfolioDraftOrder.map((child, index) => {
                                const isDragging = portfolioDraggingId === child.id;
                                return (
                                  <div
                                    key={child.id}
                                    draggable
                                    onDragStart={() => setPortfolioDraggingId(child.id)}
                                    onDragEnd={() => setPortfolioDraggingId(null)}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (!portfolioDraggingId) return;
                                      movePortfolioItem(portfolioDraggingId, child.id);
                                    }}
                                    className={`flex items-center justify-between gap-3 rounded border border-zinc-200 bg-white px-3 py-2 ${isDragging ? "opacity-50" : ""
                                      }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <span className="cursor-grab select-none text-zinc-400" aria-hidden>
                                        ☰
                                      </span>
                                      <div className="min-w-0">
                                        <div className="truncate font-medium">{child.title}</div>
                                        <div className="text-xs text-zinc-500">{`/${child.slug}`}</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-zinc-500">#{index + 1}</div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={!portfolioOrderDirty || portfolioSaving || portfolioChildrenLoading}
                            className="rounded bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
                            onClick={() => void savePortfolioOrder()}
                          >
                            {portfolioSaving ? "保存中…" : "並び順を保存"}
                          </button>
                          <button
                            type="button"
                            disabled={!portfolioOrderDirty || portfolioSaving || portfolioChildrenLoading}
                            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            onClick={resetPortfolioOrder}
                          >
                            リセット
                          </button>
                        </div>
                      </div>
                    )
                  ) : null}
                </label>
              </>
            ) : (
              <label className="text-sm">
                公開パス
                <span className="ml-1 text-xs font-normal text-zinc-500">（必須・半角英数字とハイフン推奨）</span>
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                  value={form.slug}
                  placeholder={
                    form.type === "publication"
                      ? "例: my-book（公開URL: /publications/my-book）"
                      : "例: my-article（公開URL: /articles/my-article）"
                  }
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  半角英小文字・数字・ハイフン。スラッシュでネスト可。先頭セグメントが articles / projects / reading
                  だと公開サイトと競合します。
                  {form.type === "publication"
                    ? " publications/ から始めないでください（URL に自動で付きます）。"
                    : null}
                </p>
              </label>
            )}
            <label className="text-sm">
              ページタイトル
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>
          </div>

          <div className="mt-5">
            <TiptapEditor
              key={selectedId ?? `new-${form.type}`}
              value={form.body}
              contentType={form.type}
              onChange={(body) => setForm((prev) => ({ ...prev, body }))}
            />
          </div>

          <div className="sticky bottom-0 z-30 mt-4 border-t border-zinc-200 bg-white/90 backdrop-blur pt-3 pb-4">
            {actionError && <p className="mb-2 text-sm text-red-700">{actionError}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded border cursor-pointer border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={openPreview}
              >
                プレビューページ
              </button>
              {!selectedId ? (
                <button
                  className="rounded cursor-pointer bg-zinc-900 px-4 py-2 text-white"
                  onClick={async () => {
                    setActionError(null);
                    const slug = form.slug.trim();
                    const title = form.title.trim();
                    if (!slug) {
                      setActionError(
                        form.type === "page"
                          ? "固定ページ（カスタム）のURLスラッグを入力してください"
                          : "URLスラッグを入力してください（公開URLに使います。例: about）"
                      );
                      return;
                    }
                    if (!title) {
                      setActionError("ページタイトルを入力してください");
                      return;
                    }
                    const response = await fetch("/api/admin/content", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: form.type,
                        slug,
                        title,
                        status: form.status,
                        body: form.body,
                        ...(form.type === "page" ? { pageDisplayMode: form.pageDisplayMode } : {})
                      })
                    });
                    if (!response.ok) {
                      const json = await response.json().catch(() => ({}));
                      setActionError(formatApiErrorPayload(json, `作成に失敗しました (${response.status})`));
                      return;
                    }
                    await loadList();
                    showToast("success", "作成しました");
                  }}
                >
                  作成して保存
                </button>
              ) : (
                <>
                  <button
                    className="rounded cursor-pointer bg-zinc-900 px-4 py-2 text-white"
                    onClick={async () => {
                      setActionError(null);
                      const slug = form.slug.trim();
                      const title = form.title.trim();
                      if (!slug || !title) {
                        setActionError("URLスラッグとページタイトルは必須です");
                        return;
                      }
                      const response = await fetch(`/api/admin/content/${selectedId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          slug,
                          title,
                          status: form.status,
                          body: form.body,
                          ...(form.type === "page" ? { pageDisplayMode: form.pageDisplayMode } : {})
                        })
                      });
                      if (!response.ok) {
                        const json = await response.json().catch(() => ({}));
                        setActionError(
                          formatApiErrorPayload(json, `更新に失敗しました (${response.status})`)
                        );
                        return;
                      }
                      await loadList();
                      showToast("success", "変更を保存しました");
                    }}
                  >
                    変更を保存
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-800 hover:bg-red-50"
                    onClick={async () => {
                      setActionError(null);
                      const title = form.title.trim();
                      const slug = form.slug.trim();
                      const ok = window.confirm(
                        `このコンテンツを論理削除しますか？\n\n「${title || "(無題)"}」(${form.type} / ${slug || "—"})\n\nデータベースからは消えず、一覧・公開対象から外れます。物理削除ではありません。`
                      );
                      if (!ok) return;
                      const response = await fetch(`/api/admin/content/${selectedId}`, {
                        method: "DELETE"
                      });
                      if (!response.ok) {
                        const json = await response.json().catch(() => ({}));
                        setActionError(
                          formatApiErrorPayload(json, `削除に失敗しました (${response.status})`)
                        );
                        return;
                      }
                      setSelectedId(null);
                      setContentIdQuery(null);
                      setForm({
                        type: "page",
                        slug: defaultFixedPageSlug,
                        title: defaultFixedPageTitle,
                        status: "draft",
                        body: DEFAULT_DOC,
                        pageDisplayMode: "normal"
                      });
                      await loadList();
                      showToast("success", "削除しました（論理削除）");
                    }}
                  >
                    削除
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
