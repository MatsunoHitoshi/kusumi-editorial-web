"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";

import { createTiptapExtensions } from "@/lib/tiptap-extensions";
import {
  CONTENT_PREVIEW_STORAGE_KEY,
  type ContentPreviewPayload,
  publicPath
} from "@/lib/live-preview";

function formatJpDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(d);
}

function parsePayload(raw: string | null): ContentPreviewPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<ContentPreviewPayload>;
    if (!data || typeof data !== "object") return null;
    if (!data.type || !data.slug || typeof data.title !== "string" || !data.status || !data.body) return null;
    return {
      type: data.type,
      slug: data.slug,
      title: data.title,
      status: data.status,
      body: data.body,
      selectedId: data.selectedId ?? null,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      pageDisplayMode: data.pageDisplayMode
    };
  } catch {
    return null;
  }
}

export default function AdminPreviewPage() {
  const [payload, setPayload] = useState<ContentPreviewPayload | null>(null);
  const [loadedAt, setLoadedAt] = useState<string>("");

  function reloadFromStorage() {
    const next = parsePayload(window.localStorage.getItem(CONTENT_PREVIEW_STORAGE_KEY));
    setPayload(next);
    setLoadedAt(new Date().toISOString());
  }

  useEffect(() => {
    reloadFromStorage();
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONTENT_PREVIEW_STORAGE_KEY) {
        reloadFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const html = useMemo(() => {
    if (!payload) return "";
    try {
      return generateHTML(payload.body as JSONContent, createTiptapExtensions());
    } catch {
      return "<p class=\"text-red-700\">プレビューの HTML 生成に失敗しました。</p>";
    }
  }, [payload]);

  if (!payload) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">プレビューページ</h1>
        <p className="mt-4 text-zinc-700">編集中データが見つかりません。編集画面で「プレビューページ」を押してください。</p>
        <Link href="/admin" className="mt-6 inline-block text-sm text-blue-700 underline">
          管理画面に戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 pb-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold">プレビューページ</h1>
          <p className="mt-1 text-xs text-zinc-500">
            読み込み: {formatJpDate(loadedAt)} / 編集データ更新: {formatJpDate(payload.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={reloadFromStorage}
          >
            再読み込み
          </button>
          <Link href="/admin" className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            編集画面へ戻る
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        想定URL: <span className="font-mono">{publicPath(payload.type, payload.slug)}</span>
      </p>
      <h2 className="mt-6 font-serif text-3xl font-bold text-zinc-900 sm:text-4xl">{payload.title || "(無題)"}</h2>
      <p className="mt-2 text-xs text-zinc-500">
        種別: {payload.type} / 状態: {payload.status} / id: {payload.selectedId ?? "new"}
      </p>
      {payload.type === "page" && payload.pageDisplayMode && payload.pageDisplayMode !== "normal" ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {payload.pageDisplayMode === "toc" ? (
            <p>
              <strong>目次モード</strong>
              ：公開サイトでは見出し2ごとの目次（PC左固定・スマホはヘッダ下横並び）と本文が表示されます。下記は本文プレビューのみです。
            </p>
          ) : (
            <p>
              <strong>ポートフォリオモード</strong>
              ：公開サイトでは、スラッグが「{payload.slug}
              /…」形式の子固定ページが一覧（サムネイル＋タイトル）で並びます。下記は親ページ本文のプレビューです。
            </p>
          )}
        </div>
      ) : null}

      <article
        className="prose prose-zinc mt-10 max-w-none font-serif prose-headings:font-serif prose-a:text-blue-800 prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
