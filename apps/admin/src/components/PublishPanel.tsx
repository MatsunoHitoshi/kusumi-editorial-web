"use client";

import { useEffect, useId, useState } from "react";

type Me = { role: "admin" | "editor"; email: string | null | undefined };

type PublishPreviewSummary = {
  totalPublished: number;
  byType: Record<"page" | "article" | "project" | "reading" | "publication", number>;
  items: Array<{
    id: string;
    type: string;
    slug: string;
    title: string;
    publishVersion: string | null;
    updatedAt: string;
  }>;
};

function publicPath(type: string, slug: string): string {
  if (type === "page") return `/${slug}`;
  if (type === "article") return `/articles/${slug}`;
  if (type === "project") return `/projects/${slug}`;
  if (type === "reading") return `/reading/${slug}`;
  if (type === "publication") return `/publications/${slug}`;
  return `/${slug}`;
}

export function PublishPanel() {
  const dialogId = useId();
  const confirmCheckboxId = useId();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<PublishPreviewSummary | null>(null);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/me");
      if (!res.ok) return;
      const data = (await res.json()) as Me;
      setMe(data);
    })();
  }, []);

  async function loadPreview() {
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/publish-preview");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `プレビュー取得に失敗 (${res.status})`);
        return;
      }
      setPreview((await res.json()) as PublishPreviewSummary);
    } catch {
      setError("プレビュー取得に失敗しました");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function openConfirmDialog() {
    setPublishConfirmed(false);
    setReason("");
    setMessage(null);
    setError(null);
    setDialogOpen(true);
    await loadPreview();
  }

  function closeDialog() {
    if (loading) return;
    setDialogOpen(false);
    setPreview(null);
    setPublishConfirmed(false);
  }

  async function handlePublish() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/workflows/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullRebuild: true,
          confirmPublication: true,
          reason: reason.trim() || undefined
        })
      });
      const data = (await res.json()) as {
        ok?: boolean;
        publishVersion?: string;
        publishedCount?: number;
        localBuild?: boolean;
        error?: string;
        detail?: string;
        issues?: Array<{ message: string }>;
      };
      const issues = data.issues;
      if (!res.ok) {
        if (issues?.length) {
          setError(issues.map((i) => i.message).join(" / "));
        } else {
          setError(data.detail ?? data.error ?? `HTTP ${res.status}`);
        }
        return;
      }
      setMessage(
        data.localBuild
          ? `ローカルでサイトをビルドしました。 publishVersion=${data.publishVersion}（${data.publishedCount ?? 0} 件の published にタグ付け）apps/site/out を確認してください。`
          : `公開反映をキューしました。 publishVersion=${data.publishVersion}（${data.publishedCount ?? 0} 件の published にタグ付け）`
      );
      setDialogOpen(false);
      setPreview(null);
      setPublishConfirmed(false);
      setReason("");
    } catch {
      setError("リクエストに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    publishConfirmed && !loading && (preview?.totalPublished ?? 0) > 0;

  return (
    <section className="rounded border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">サイトの公開反映</h2>
      <p className="mt-2 text-sm text-zinc-600">
        それぞれの記事を作成したり、変更を保存するだけでは公開サイトへの反映は行われません。
        公開反映を行うことで、現在の編集内容からページを構築して GitHub Pages（Webページ公開サービス）に反映します。誤操作防止のため最終確認があります。
      </p>
      {me?.role === "admin" ? (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="rounded bg-amber-700 px-4 py-2 text-sm text-white hover:bg-amber-800"
            onClick={() => void openConfirmDialog()}
          >
            公開反映の確認へ進む
          </button>
          {message && <p className="text-sm text-green-800">{message}</p>}
          {error && !dialogOpen && <p className="text-sm text-red-700">{error}</p>}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          公開反映は <strong>admin</strong> ロールのみ実行できます（現在: {me?.role ?? "読み込み中…"}）。
        </p>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-lg"
          >
            <h3 id={`${dialogId}-title`} className="text-lg font-semibold">
              公開反映の最終確認
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              次の一覧がそのまま新しい 公開バージョンとして付与され、サイトビルドの対象になります。公開すべきでない項目が{" "}
              <code className="rounded bg-zinc-100 px-1">draft</code> になっているか、あらためて確認してください。
            </p>

            {previewLoading && <p className="mt-4 text-sm text-zinc-500">読み込み中…</p>}

            {preview && !previewLoading && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
                  {(
                    [
                      ["page", "ページ"],
                      ["article", "記事"],
                      ["project", "プロジェクト"],
                      ["reading", "読書会"],
                      ["publication", "出版物（個別）"]
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2">
                      <div className="text-xs text-zinc-500">{label}</div>
                      <div className="font-medium">{preview.byType[key]}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm font-medium">計 {preview.totalPublished} 件が公開対象</p>
                {preview.totalPublished === 0 ? (
                  <p className="mt-2 text-sm text-amber-800">
                    公開中のコンテンツがありません。先にエディタで status を published にしてから実行してください。
                  </p>
                ) : (
                  <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm border-t border-zinc-100 pt-3">
                    {preview.items.map((item) => (
                      <li key={item.id} className="flex flex-wrap gap-x-2 border-b border-zinc-50 py-1">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-zinc-500">{publicPath(item.type, item.slug)}</span>
                        {item.publishVersion && (
                          <span className="text-xs text-zinc-400">v{item.publishVersion}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex items-start gap-2">
                  <input
                    id={confirmCheckboxId}
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-amber-700 focus:ring-amber-600"
                    checked={publishConfirmed}
                    onChange={(e) => setPublishConfirmed(e.target.checked)}
                  />
                  <label htmlFor={confirmCheckboxId} className="text-sm text-zinc-800">
                    上記の公開対象で問題ないことを確認し、公開反映処理をキューしてよい
                  </label>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-zinc-800">メモ（任意・GitHub Actions の reason に渡します）</label>
                  <input
                    type="text"
                    maxLength={200}
                    className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="例: About 更新"
                  />
                </div>
              </>
            )}

            {error && dialogOpen && <p className="mt-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={loading}
                className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                onClick={closeDialog}
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!canSubmit || previewLoading}
                className="rounded bg-amber-700 px-4 py-2 text-sm text-white hover:bg-amber-800 disabled:opacity-50"
                onClick={() => void handlePublish()}
              >
                {loading ? "送信中…" : "実行して公開反映をキュー"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
