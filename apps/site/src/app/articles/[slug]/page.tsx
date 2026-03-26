import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentDetail } from "@/components/ContentDetail";
import { metadataForContent } from "@/lib/content-metadata";
import { fetchPublishSnapshot } from "@/lib/publish-client";
import { isExportPlaceholderSlug, withExportPlaceholder } from "@/lib/static-export-placeholder";

/** dev では force-static + [slug] の組み合わせで未生成パスが 500 になり得るため付けない（export 時は generateStaticParams で SSG される） */
export const dynamicParams = true;

export async function generateStaticParams() {
  const envelope = await fetchPublishSnapshot();
  return withExportPlaceholder(envelope.snapshot.articles.map((a) => ({ slug: a.slug })));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (isExportPlaceholderSlug(params.slug)) {
    return { title: "見つかりません" };
  }
  const envelope = await fetchPublishSnapshot();
  const doc = envelope.snapshot.articles.find((a) => a.slug === params.slug);
  if (!doc) {
    return { title: "見つかりません" };
  }
  return metadataForContent(doc);
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  if (isExportPlaceholderSlug(params.slug)) {
    notFound();
  }
  const envelope = await fetchPublishSnapshot();
  const doc = envelope.snapshot.articles.find((a) => a.slug === params.slug);
  if (!doc) {
    notFound();
  }
  return <ContentDetail doc={doc} sectionLabel="記事" listHref="/#articles" />;
}
