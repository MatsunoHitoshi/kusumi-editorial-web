import type { BaseContent } from "@kusumi/content-schema";
import Link from "next/link";

import { tiptapDocToHtml } from "@/lib/tiptap-to-html";

interface ContentDetailProps {
  doc: BaseContent;
  sectionLabel: string;
  listHref: string;
}

function formatJpDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(d);
  } catch {
    return iso;
  }
}

export function ContentDetail({ doc, sectionLabel, listHref }: ContentDetailProps) {
  const html = tiptapDocToHtml(doc.body);
  const publishedTime = doc.publishedAt ? new Date(doc.publishedAt).getTime() : null;
  const updatedTime = new Date(doc.updatedAt).getTime();
  const hasSamePublishedAndUpdated =
    publishedTime !== null &&
    Number.isFinite(publishedTime) &&
    Number.isFinite(updatedTime) &&
    publishedTime === updatedTime;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-4 py-8 pb-14 sm:px-6 sm:py-10 sm:pb-16">
        <nav className="text-xs text-zinc-600 sm:text-sm" aria-label="パンくず">
          <Link href="/" className="text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
            ホーム
          </Link>
          <span className="mx-2 text-zinc-400" aria-hidden>
            /
          </span>
          <Link
            href={listHref}
            className="text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
          >
            {sectionLabel}
          </Link>
        </nav>
        <h1 className="mt-6 font-serif text-2xl font-bold text-zinc-900 sm:mt-8 sm:text-4xl">{doc.title}</h1>
        <div className="mt-2 text-xs text-zinc-500 sm:mt-3 sm:text-sm">
          {hasSamePublishedAndUpdated && doc.publishedAt ? (
            <p>
              公開日: <time dateTime={doc.publishedAt}>{formatJpDate(doc.publishedAt)}</time>
            </p>
          ) : (
            <p>
              更新日: <time dateTime={doc.updatedAt}>{formatJpDate(doc.updatedAt)}</time>
            </p>
          )}
        </div>
        <article
          className="prose prose-zinc font-serif prose-headings:font-serif prose-a:text-blue-800 prose-a:break-all prose-img:rounded-lg max-w-none mt-10 max-sm:prose-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
