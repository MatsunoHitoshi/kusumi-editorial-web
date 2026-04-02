"use client";

import { useEffect, useMemo, useState } from "react";

type DeployHistoryItem = {
  id: string;
  publishVersion: string;
  status: "queued" | "building" | "deploying" | "succeeded" | "failed";
  queuedAt: string | null;
  finishedAt: string | null;
  triggeredBy: string | null;
  reason: string | null;
  githubRunId: string | null;
  githubRunAttempt: number | null;
  githubRunUrl: string | null;
  buildConclusion: string | null;
  deployConclusion: string | null;
};

type DeployHistoryResponse = {
  latestSuccessful: DeployHistoryItem | null;
  recent: DeployHistoryItem[];
};

function formatJpDateTime(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function statusLabel(status: DeployHistoryItem["status"]): string {
  if (status === "queued") return "キュー済み";
  if (status === "building") return "ビルド中";
  if (status === "deploying") return "デプロイ中";
  if (status === "succeeded") return "成功";
  return "失敗";
}

function statusTone(status: DeployHistoryItem["status"]): string {
  if (status === "succeeded") return "text-green-800 bg-green-50 border-green-200";
  if (status === "failed") return "text-red-800 bg-red-50 border-red-200";
  if (status === "deploying") return "text-blue-800 bg-blue-50 border-blue-200";
  if (status === "building") return "text-amber-800 bg-amber-50 border-amber-200";
  return "text-zinc-700 bg-zinc-50 border-zinc-200";
}

export function DeployHistoryPanel() {
  const [data, setData] = useState<DeployHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestSuccessful = data?.latestSuccessful ?? null;
  const recent = data?.recent ?? [];

  const shouldPoll = useMemo(
    () => recent.some((r) => r.status === "queued" || r.status === "building" || r.status === "deploying"),
    [recent]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/deploy-history", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as DeployHistoryResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setData(json);
    } catch {
      setError("履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = window.setInterval(() => {
      void load();
    }, 12_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll]);

  return (
    <section className="rounded border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">公開反映の履歴</h2>
        <button
          type="button"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "更新中…" : "更新"}
        </button>
      </div>

      <div className="mt-3 text-sm text-zinc-700">
        <p>
          <span className="font-medium">最終成功:</span>{" "}
          {latestSuccessful ? (
            <>
              {formatJpDateTime(latestSuccessful.finishedAt ?? latestSuccessful.queuedAt)}（v
              {latestSuccessful.publishVersion}）
            </>
          ) : (
            "まだありません"
          )}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          キュー投入後、GitHub Actions からのコールバックで成功/失敗が確定します。
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="py-2 pr-4">publishVersion</th>
              <th className="py-2 pr-4">状態</th>
              <th className="py-2 pr-4">投入</th>
              <th className="py-2 pr-4">完了</th>
              <th className="py-2 pr-4">実行者</th>
              <th className="py-2 pr-4">メモ</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td className="py-3 text-zinc-500" colSpan={7}>
                  履歴がありません。
                </td>
              </tr>
            ) : (
              recent.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 align-top">
                  <td className="py-2 pr-4 font-mono tabular-nums text-zinc-800">{row.publishVersion}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-xs ${statusTone(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                    <div className="mt-1 text-xs text-zinc-500">
                      {row.buildConclusion ? `build: ${row.buildConclusion}` : null}
                      {row.buildConclusion && row.deployConclusion ? " / " : null}
                      {row.deployConclusion ? `deploy: ${row.deployConclusion}` : null}
                    </div>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatJpDateTime(row.queuedAt)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatJpDateTime(row.finishedAt)}</td>
                  <td className="py-2 pr-4 text-zinc-700">{row.triggeredBy ?? "-"}</td>
                  <td className="py-2 pr-4 text-zinc-700">{row.reason ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {row.githubRunUrl ? (
                      <a
                        href={row.githubRunUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-700"
                      >
                        run
                        {row.githubRunAttempt ? ` (${row.githubRunAttempt})` : ""}
                      </a>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

