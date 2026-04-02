import Link from "next/link";
import type { BaseContent, PageContent } from "@kusumi/content-schema";

import { tiptapDocToHtml } from "@/lib/tiptap-to-html";
import {
  assignH2IdsFromEntries,
  extractH2Entries,
  findFirstImageSrcFromDoc,
  listImmediateChildPages
} from "@/lib/tiptap-page-utils";

import { PageLayoutShell } from "./PageLayoutShell";
import { TocNavScrollSpy } from "./TocNavScrollSpy";

const proseArticle =
  "prose prose-zinc font-serif prose-headings:font-serif prose-a:text-blue-800 prose-a:break-all prose-img:rounded-lg max-w-none max-sm:prose-sm";

interface PageNormalProps {
  doc: PageContent;
  sectionLabel: string;
  listHref: string;
}

export function PageContentNormal({ doc, sectionLabel, listHref }: PageNormalProps) {
  const html = tiptapDocToHtml(doc.body);
  return (
    <PageLayoutShell
      title={doc.title}
      publishedAt={doc.publishedAt}
      updatedAt={doc.updatedAt}
      sectionLabel={sectionLabel}
      listHref={listHref}
    >
      <article
        className={`${proseArticle} mt-10`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </PageLayoutShell>
  );
}

interface PageTocProps {
  doc: PageContent;
  sectionLabel: string;
  listHref: string;
}

export function PageContentWithToc({ doc, sectionLabel, listHref }: PageTocProps) {
  const entries = extractH2Entries(doc.body);
  const rawHtml = tiptapDocToHtml(doc.body);
  const html = entries.length > 0 ? assignH2IdsFromEntries(rawHtml, entries) : rawHtml;

  const publishedTime = doc.publishedAt ? new Date(doc.publishedAt).getTime() : null;
  const updatedTime = new Date(doc.updatedAt).getTime();
  const hasSamePublishedAndUpdated =
    publishedTime !== null &&
    Number.isFinite(publishedTime) &&
    Number.isFinite(updatedTime) &&
    publishedTime === updatedTime;

  function formatJpDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long" }).format(d);
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <TocNavScrollSpy entries={entries} />
      </div>

      {/* SP: 1カラム。MD+: 目次はビューポート左の独立列（max-w コンテナ外）、本文のみ従来どおり中央寄せ max-w-3xl */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(10.5rem,auto)_1fr] md:items-start lg:grid-cols-[minmax(12rem,auto)_1fr]">
        <aside
          className="sticky top-8 z-10 hidden h-max max-h-[calc(100vh-2.5rem)] overflow-y-auto py-8 pl-4 pr-2 md:block lg:pl-6 lg:pr-3 xl:w-56 xl:max-w-none"
          aria-label="ページ内目次"
        >
          <TocNavScrollSpy entries={entries} />
        </aside>

        <div className="min-w-0 px-4 py-6 pb-14 sm:px-6 sm:py-8 md:py-8 md:pb-16 md:pl-4 md:pr-6 lg:pr-8">
          <div className="mx-auto w-full max-w-4xl">
            <nav className="text-xs text-zinc-600 sm:text-sm" aria-label="パンくず">
              <Link
                href="/"
                className="text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
              >
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
              className={`${proseArticle} mt-10 [&_h2]:scroll-mt-[132px] md:[&_h2]:scroll-mt-24`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PagePortfolioProps {
  doc: PageContent;
  allPages: PageContent[];
  sectionLabel: string;
  listHref: string;
}

export function PageContentPortfolio({ doc, allPages, sectionLabel, listHref }: PagePortfolioProps) {
  const introHtml = tiptapDocToHtml(doc.body);
  const children = listImmediateChildPages(allPages, doc.slug).sort((a, b) => {
    const ao = a.portfolioOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.portfolioOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title, "ja", { sensitivity: "base" });
  });

  return (
    <PageLayoutShell
      title={doc.title}
      publishedAt={doc.publishedAt}
      updatedAt={doc.updatedAt}
      sectionLabel={sectionLabel}
      listHref={listHref}
    >
      <article
        className={`${proseArticle} mt-10 border-b border-zinc-100 pb-10`}
        dangerouslySetInnerHTML={{ __html: introHtml }}
      />

      <section className="mt-10" aria-label="子ページ一覧">
        {children.length === 0 ? (
          <p className="text-sm text-zinc-500">このページの直下に登録された子ページはまだありません。</p>
        ) : (
          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const thumb = findFirstImageSrcFromDoc(child.body);
              return (
                <li key={child.slug}>
                  <Link
                    href={`/${child.slug}`}
                    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 transition group-hover:ring-zinc-400">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400">
                          <span className="text-4xl font-serif" aria-hidden>
                            ◆
                          </span>
                        </div>
                      )}
                    </div>
                    <h2 className="mt-3 font-serif text-base font-semibold text-zinc-900 group-hover:text-zinc-700 group-hover:underline decoration-zinc-300 underline-offset-2">
                      {child.title}
                    </h2>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageLayoutShell>
  );
}

interface PublicationsPortfolioProps {
  /** `type=page`（slug=publications）の本文（イントロ） */
  doc: PageContent;
  /** `type=publication`（/publications/**） */
  publications: Array<BaseContent & { type: "publication" }>;
  sectionLabel: string;
  listHref: string;
}

/**
 * `/publications` 固定ページの `portfolio` 表示を、`type=publication` 側から一覧するための専用ビュー。
 *
 * `PageContentPortfolio` は `type=page` の親子関係しか見ないため、出版物（個別）を表示できない。
 */
export function PublicationsPortfolio({
  doc,
  publications,
  sectionLabel,
  listHref
}: PublicationsPortfolioProps) {
  const introHtml = tiptapDocToHtml(doc.body);
  const children = [...publications].sort((a, b) => {
    const ao = a.portfolioOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.portfolioOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title, "ja", { sensitivity: "base" });
  });

  return (
    <PageLayoutShell
      title={doc.title}
      publishedAt={doc.publishedAt}
      updatedAt={doc.updatedAt}
      sectionLabel={sectionLabel}
      listHref={listHref}
    >
      <article
        className={`${proseArticle} mt-10 border-b border-zinc-100 pb-10`}
        dangerouslySetInnerHTML={{ __html: introHtml }}
      />

      <section className="mt-10" aria-label="出版物一覧">
        {children.length === 0 ? (
          <p className="text-sm text-zinc-500">登録された出版物はまだありません。</p>
        ) : (
          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const thumb = findFirstImageSrcFromDoc(child.body);
              return (
                <li key={child.slug}>
                  <Link
                    href={`/publications/${child.slug}`}
                    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 transition group-hover:ring-zinc-400">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400">
                          <span className="text-4xl font-serif" aria-hidden>
                            ◆
                          </span>
                        </div>
                      )}
                    </div>
                    <h2 className="mt-3 font-serif text-base font-semibold text-zinc-900 group-hover:text-zinc-700 group-hover:underline decoration-zinc-300 underline-offset-2">
                      {child.title}
                    </h2>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageLayoutShell>
  );
}
