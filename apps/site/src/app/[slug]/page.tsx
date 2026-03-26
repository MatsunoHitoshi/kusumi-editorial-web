import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentDetail } from "@/components/ContentDetail";
import { metadataForContent } from "@/lib/content-metadata";
import { fetchPublishSnapshot } from "@/lib/publish-client";
import { isExportPlaceholderSlug, withExportPlaceholder } from "@/lib/static-export-placeholder";

/**
 * 固定ページ（CMS type=page）。URL は `/pages/...` ではなくルート直下（例: `/about`, `/faculty`）。
 * `/articles/*`・`/projects/*`・`/reading/*` は別ルートのため、1 セグメントでは競合しない。
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const envelope = await fetchPublishSnapshot();
  return withExportPlaceholder(envelope.snapshot.pages.map((p) => ({ slug: p.slug })));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (isExportPlaceholderSlug(params.slug)) {
    return { title: "見つかりません" };
  }
  const envelope = await fetchPublishSnapshot();
  const doc = envelope.snapshot.pages.find((p) => p.slug === params.slug);
  if (!doc) {
    return { title: "見つかりません" };
  }
  return metadataForContent(doc);
}

export default async function PublishedPage({ params }: { params: { slug: string } }) {
  if (isExportPlaceholderSlug(params.slug)) {
    notFound();
  }
  const envelope = await fetchPublishSnapshot();
  const doc = envelope.snapshot.pages.find((p) => p.slug === params.slug);
  if (!doc) {
    notFound();
  }
  return <ContentDetail doc={doc} sectionLabel="目次" listHref="/#toc" />;
}
