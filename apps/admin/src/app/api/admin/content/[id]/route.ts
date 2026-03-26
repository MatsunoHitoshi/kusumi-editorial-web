import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notDeletedContentWhere } from "@/lib/content-document-scope";
import { getSessionUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const contentStatusSchema = z.enum(["draft", "published"]);

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  status: contentStatusSchema.optional(),
  body: z.record(z.unknown()).optional()
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

    const updated = await prisma.contentDocument.update({
      where: { id: params.id },
      data: {
        slug: payload.slug,
        title: payload.title,
        body: payload.body as any,
        status: payload.status,
        publishedAt:
          payload.status === "published"
            ? new Date()
            : payload.status === "draft"
              ? null
              : undefined
      }
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
