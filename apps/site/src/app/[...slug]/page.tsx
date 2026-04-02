import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PageContentNormal,
  PublicationsPortfolio,
  PageContentPortfolio,
  PageContentWithToc
} from "@/components/PageContentViews";
import { metadataForContent } from "@/lib/content-metadata";
import { fetchPublishSnapshot } from "@/lib/publish-client";
import { resolvePageDisplayMode } from "@/lib/tiptap-page-utils";
import {
  isExportPlaceholderSegments,
  withExportPlaceholderSegments
} from "@/lib/static-export-placeholder";

/**
 * 固定ページ（CMS type=page）。`/publications` は一覧用の固定ページ、個別は `apps/site/src/app/publications/[...slug]`。
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const envelope = await fetchPublishSnapshot();
  return withExportPlaceholderSegments(
    envelope.snapshot.pages.map((p) => ({
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
  const doc = envelope.snapshot.pages.find((p) => p.slug === path);
  if (!doc) {
    return { title: "見つかりません" };
  }
  return metadataForContent(doc);
}

export default async function PublishedPage({ params }: { params: { slug: string[] } }) {
  if (isExportPlaceholderSegments(params.slug)) {
    notFound();
  }
  const path = params.slug.join("/");
  const envelope = await fetchPublishSnapshot();
  const doc = envelope.snapshot.pages.find((p) => p.slug === path);
  if (!doc) {
    notFound();
  }

  const mode = resolvePageDisplayMode(doc);
  const isPublicationsRoot = path === "publications";
  const common = {
    sectionLabel: isPublicationsRoot ? "出版物" : "目次",
    listHref: isPublicationsRoot ? "/publications" : "/#toc"
  };

  if (mode === "toc") {
    return <PageContentWithToc doc={doc} {...common} />;
  }
  if (mode === "portfolio") {
    if (isPublicationsRoot) {
      return (
        <PublicationsPortfolio
          doc={doc}
          publications={envelope.snapshot.publications}
          {...common}
        />
      );
    }
    return <PageContentPortfolio doc={doc} allPages={envelope.snapshot.pages} {...common} />;
  }
  return <PageContentNormal doc={doc} {...common} />;
}
