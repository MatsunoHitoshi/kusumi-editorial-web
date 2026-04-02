import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentDetail } from "@/components/ContentDetail";
import { metadataForContent } from "@/lib/content-metadata";
import { fetchPublishSnapshot } from "@/lib/publish-client";
import {
  isExportPlaceholderSegments,
  withExportPlaceholderSegments
} from "@/lib/static-export-placeholder";

/**
 * 出版物（個別）。DB の slug は `/publications` より後ろのみ（例: my-book / series/vol-1）。
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const envelope = await fetchPublishSnapshot();
  return withExportPlaceholderSegments(
    envelope.snapshot.publications.map((p) => ({
      slug: p.slug.split("/").filter(Boolean)
    }))
  );
}

export async function generateMetadata({
  params
}: {
  params: { slug: string[] };
}): Promise<Metadata> {
  if (isExportPlaceholderSegments(params.slug)) {
    return { title: "見つかりません" };
  }
  const path = params.slug.join("/");
  const envelope = await fetchPublishSnapshot();
  const doc = envelope.snapshot.publications.find((p) => p.slug === path);
  if (!doc) {
    return { title: "見つかりません" };
  }
  return metadataForContent(doc);
}

export default async function PublicationPage({ params }: { params: { slug: string[] } }) {
  if (isExportPlaceholderSegments(params.slug)) {
    notFound();
  }
  const path = params.slug.join("/");
  const envelope = await fetchPublishSnapshot();
  const doc = envelope.snapshot.publications.find((p) => p.slug === path);
  if (!doc) {
    notFound();
  }
  return <ContentDetail doc={doc} sectionLabel="出版物" listHref="/publications" />;
}
