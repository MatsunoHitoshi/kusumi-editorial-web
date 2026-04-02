import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notDeletedContentWhere } from "@/lib/content-document-scope";
import { getSessionUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePublicSlug, type SlugContentType } from "@/lib/slug-validation";

const contentStatusSchema = z.enum(["draft", "published"]);
const pageDisplayModeSchema = z.enum(["normal", "toc", "portfolio"]);

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  status: contentStatusSchema.optional(),
  body: z.record(z.unknown()).optional(),
  pageDisplayMode: pageDisplayModeSchema.nullable().optional(),
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

interface Params {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const payload = updateSchema.parse(await request.json());
    const active = await prisma.contentDocument.findFirst({
      where: { id: params.id, ...notDeletedContentWhere }
    });
    if (!active) {
      const row = await prisma.contentDocument.findUnique({ where: { id: params.id } });
      if (!row) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "deleted" }, { status: 410 });
    }

    if (payload.slug !== undefined) {
      const slugCheck = validatePublicSlug(payload.slug, active.type as SlugContentType);
      if (!slugCheck.ok) {
        return NextResponse.json({ error: slugCheck.message }, { status: 400 });
      }
    }

    const data: Parameters<typeof prisma.contentDocument.update>[0]["data"] = {};
    if (payload.slug !== undefined) data.slug = payload.slug.trim();
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.body !== undefined) data.body = payload.body as object;
    if (payload.status !== undefined) {
      data.status = payload.status;
      data.publishedAt =
        payload.status === "published" ? new Date() : payload.status === "draft" ? null : undefined;
    }
    if (payload.pageDisplayMode !== undefined) {
      if (active.type === "page") {
        data.pageDisplayMode = payload.pageDisplayMode;
      }
    }
    if (payload.portfolioOrder !== undefined) {
      if (active.type !== "page" && active.type !== "publication") {
        return NextResponse.json(
          { error: "portfolioOrder は type=page / publication のときのみ使用できます" },
          { status: 400 }
        );
      }
      data.portfolioOrder = payload.portfolioOrder;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "更新する項目がありません" }, { status: 400 });
    }

    const updated = await prisma.contentDocument.update({
      where: { id: params.id },
      data
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString()
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "同じ type / slug / status のドキュメントが既に存在します" },
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

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const result = await prisma.contentDocument.updateMany({
      where: { id: params.id, ...notDeletedContentWhere },
      data: { deletedAt: new Date() }
    });

    if (result.count === 0) {
      const row = await prisma.contentDocument.findUnique({ where: { id: params.id } });
      if (!row) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2025")) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
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

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const doc = await prisma.contentDocument.findFirst({
      where: { id: params.id, ...notDeletedContentWhere }
    });
    if (!doc) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: doc.id,
      schemaVersion: doc.schemaVersion,
      type: doc.type,
      slug: doc.slug,
      title: doc.title,
      status: doc.status,
      body: doc.body,
      pageDisplayMode: doc.pageDisplayMode,
      portfolioOrder: doc.portfolioOrder,
      publishVersion: doc.publishVersion,
      publishedAt: doc.publishedAt?.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}
