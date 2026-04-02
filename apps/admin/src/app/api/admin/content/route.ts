import { NextResponse } from "next/server";
import { z } from "zod";
import { notDeletedContentWhere } from "@/lib/content-document-scope";
import { getSessionUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePublicSlug } from "@/lib/slug-validation";

const contentTypeSchema = z.enum(["page", "article", "project", "reading", "publication"]);
const contentStatusSchema = z.enum(["draft", "published"]);
const pageDisplayModeSchema = z.enum(["normal", "toc", "portfolio"]);

const createSchema = z.object({
  type: contentTypeSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  status: contentStatusSchema.default("draft"),
  body: z.record(z.unknown()).default({ type: "doc", content: [] }),
  pageDisplayMode: pageDisplayModeSchema.optional(),
  portfolioOrder: z.number().int().nonnegative().nullable().optional()
});

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export async function GET() {
  try {
    await getSessionUser();
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const docs = await prisma.contentDocument.findMany({
    where: notDeletedContentWhere,
    orderBy: [{ updatedAt: "desc" }],
    take: 100
  });

  return NextResponse.json({
    items: docs.map((doc: {
      id: string;
      type: string;
      slug: string;
      title: string;
      status: string;
      publishVersion: string | null;
      createdAt: Date;
      updatedAt: Date;
    }) => ({
      id: doc.id,
      type: doc.type,
      slug: doc.slug,
      title: doc.title,
      status: doc.status,
      publishVersion: doc.publishVersion,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    }))
  });
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const payload = createSchema.parse(await request.json());
    const slugCheck = validatePublicSlug(payload.slug, payload.type);
    if (!slugCheck.ok) {
      return NextResponse.json({ error: slugCheck.message }, { status: 400 });
    }
    const pageDisplayMode =
      payload.type === "page" ? (payload.pageDisplayMode ?? null) : null;
    const portfolioOrder =
      payload.type === "page" || payload.type === "publication"
        ? (payload.portfolioOrder ?? null)
        : null;
    const created = await prisma.contentDocument.create({
      data: {
        schemaVersion: 1,
        type: payload.type,
        slug: payload.slug.trim(),
        title: payload.title,
        status: payload.status,
        body: payload.body as any,
        pageDisplayMode,
        portfolioOrder,
        publishedAt: payload.status === "published" ? new Date() : null
      }
    });

    return NextResponse.json({
      id: created.id,
      type: created.type,
      slug: created.slug,
      title: created.title,
      status: created.status
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "同じ type / slug / status のドキュメントが既に存在します（論理削除されていない行のみ一意です）" },
        { status: 409 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid payload", issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}
