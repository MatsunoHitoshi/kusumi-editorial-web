"use client";

import { useEffect, useState } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import {
  CONTENT_PREVIEW_STORAGE_KEY,
  type ContentPreviewPayload,
  publicPath
} from "@/lib/live-preview";

type ContentType = "page" | "article" | "project" | "reading";
type Status = "draft" | "published";

interface ContentSummary {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  status: Status;
  publishVersion?: string | null;
  updatedAt: string;
}

interface ContentDetail extends ContentSummary {
  body: Record<string, unknown>;
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
  reading: "読書会（個別）"
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

export function ContentManager() {
  const [items, setItems] = useState<ContentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isListOpen, setIsListOpen] = useState(true);
  const [form, setForm] = useState<{
    type: ContentType;
    slug: string;
    title: string;
    status: Status;
    body: Record<string, unknown>;
  }>({
    type: "page",
    slug: defaultFixedPageSlug,
    title: defaultFixedPageTitle,
    status: "draft",
    body: DEFAULT_DOC
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
      body: data.body ?? DEFAULT_DOC
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
      updatedAt: new Date().toISOString()
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
      updatedAt: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(CONTENT_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore localStorage errors
    }
    window.open("/admin/preview", "_blank", "noopener,noreferrer");
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
                      body: DEFAULT_DOC
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
            </div>
            <ul className="space-y-2">
              {showDraftPreview && (
                <li>
                  <div className="w-full rounded border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 opacity-50">
                    <div className="font-medium">{form.title}</div>
                    <div className="text-xs text-zinc-600">{publicPath(form.type, previewSlug)}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5">{contentTypeLabel[form.type]}</span>
                      <span className={statusBadgeClass(form.status)}>{statusLabel[form.status]}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">(未保存プレビュー)</div>
                  </div>
                </li>
              )}
              {items.map((item) => (
                <li key={item.id}>
                  <button
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
                </li>
              ))}
            </ul>
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
                        title: prev.title.trim().length === 0 ? defaultFixedPageTitle : prev.title
                      };
                    }
                    return {
                      ...prev,
                      type: nextType,
                      slug: ""
                    };
                  })
                }
              >
                <option value="page">トップ目次の固定ページ</option>
                <option value="article">記事</option>
                <option value="project">プロジェクト（個別）</option>
                <option value="reading">読書会（個別）</option>
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
                  <input
                    className="mt-3 w-full rounded border border-zinc-300 px-3 py-2"
                    value={form.slug}
                    placeholder="例: about（公開URL: /about）"
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  />
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">公開URL: /{form.slug}</p>
                )}
              </label>
            ) : (
              <label className="text-sm">
                公開パス
                <span className="ml-1 text-xs font-normal text-zinc-500">（必須・半角英数字とハイフン推奨）</span>
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                  value={form.slug}
                  placeholder="例: 入力: about→（公開URL: /about）"
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                />
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

          {actionError && <p className="mt-3 text-sm text-red-700">{actionError}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
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
                    body: JSON.stringify({ ...form, slug, title })
                  });
                  if (!response.ok) {
                    const json = await response.json().catch(() => ({}));
                    setActionError(
                      formatApiErrorPayload(json, `作成に失敗しました (${response.status})`)
                    );
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
                        body: form.body
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
                      body: DEFAULT_DOC
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
        </section>
      </div>
    </>
  );
}
