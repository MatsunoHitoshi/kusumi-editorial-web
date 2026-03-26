import type { PublishSnapshot } from "@kusumi/content-schema";
import { notDeletedContentWhere } from "@/lib/content-document-scope";
import { prisma } from "@/lib/prisma";

export type ContentTypeValue = "page" | "article" | "project" | "reading";

export const contentTypeByBucket: Record<"pages" | "articles" | "projects" | "reading", ContentTypeValue> = {
  pages: "page",
  articles: "article",
  projects: "project",
  reading: "reading"
};

type ContentStatusValue = "draft" | "published";

function asContent<
  T extends "page" | "article" | "project" | "reading"
>(
  doc: {
    schemaVersion: number;
    slug: string;
    title: string;
    status: string;
    body: unknown;
    updatedAt: Date;
    publishedAt: Date | null;
  },
  type: T
) {
  return {
    schemaVersion: doc.schemaVersion,
    type,
    slug: doc.slug,
    title: doc.title,
    status: doc.status as ContentStatusValue,
    body: doc.body as { type: string; content?: unknown[] },
    updatedAt: doc.updatedAt.toISOString(),
    publishedAt: doc.publishedAt?.toISOString()
  };
}

/** 公開済みドキュメントに付いている publishVersion のうち最新（文字列比較で yyyyMMddHHmmss） */
export async function getLatestPublishVersionTag(): Promise<string | null> {
  const agg = await prisma.contentDocument.aggregate({
    where: {
      ...notDeletedContentWhere,
      status: "published",
      publishVersion: { not: null }
    },
    _max: { publishVersion: true }
  });
  return agg._max.publishVersion ?? null;
}

export async function getPublishSnapshot(publishVersion: string): Promise<PublishSnapshot> {
  const docs = await prisma.contentDocument.findMany({
    where: {
      ...notDeletedContentWhere,
      status: "published",
      publishVersion
    },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }]
  });

  return {
    version: publishVersion,
    generatedAt: new Date().toISOString(),
    pages: docs
      .filter((doc) => doc.type === "page")
      .map((doc) => asContent(doc, "page")),
    articles: docs
      .filter((doc) => doc.type === "article")
      .map((doc) => asContent(doc, "article")),
    projects: docs
      .filter((doc) => doc.type === "project")
      .map((doc) => asContent(doc, "project")),
    readings: docs
      .filter((doc) => doc.type === "reading")
      .map((doc) => asContent(doc, "reading"))
  };
}

export async function assignPublishVersion(publishVersion: string): Promise<number> {
  const result = await prisma.contentDocument.updateMany({
    where: { ...notDeletedContentWhere, status: "published" },
    data: { publishVersion }
  });
  return result.count;
}

export interface PublishPreviewItem {
  id: string;
  type: ContentTypeValue;
  slug: string;
  title: string;
  publishVersion: string | null;
  updatedAt: string;
}

export interface PublishPreviewSummary {
  totalPublished: number;
  byType: Record<"page" | "article" | "project" | "reading", number>;
  items: PublishPreviewItem[];
}

export async function getPublishPreviewSummary(): Promise<PublishPreviewSummary> {
  const published = await prisma.contentDocument.findMany({
    where: { ...notDeletedContentWhere, status: "published" },
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      publishVersion: true,
      updatedAt: true
    },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }]
  });

  const byType: PublishPreviewSummary["byType"] = {
    page: 0,
    article: 0,
    project: 0,
    reading: 0
  };

  for (const row of published) {
    const key = row.type as keyof typeof byType;
    byType[key] += 1;
  }

  return {
    totalPublished: published.length,
    byType,
    items: published.map((row) => ({
      id: row.id,
      type: row.type,
      slug: row.slug,
      title: row.title,
      publishVersion: row.publishVersion,
      updatedAt: row.updatedAt.toISOString()
    }))
  };
}
