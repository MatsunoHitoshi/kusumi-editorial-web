import { NextResponse } from "next/server";
import { ContentStatus, ContentType, Prisma } from "@prisma/client";
import { z } from "zod";
import { notDeletedContentWhere } from "@/lib/content-document-scope";
import { getSessionUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  type: z.nativeEnum(ContentType),
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.nativeEnum(ContentStatus).default(ContentStatus.draft),
  body: z.record(z.unknown()).default({ type: "doc", content: [] })
});

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
    items: docs.map((doc) => ({
      id: doc.id,
      type: doc.type,
      slug: doc.slug,
      title: doc.title,
      status: doc.status,
      publishVersion: doc.publishVersion,
      updatedAt: doc.updatedAt.toISOString()
    }))
  });
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const payload = createSchema.parse(await request.json());
    const created = await prisma.contentDocument.create({
      data: {
        schemaVersion: 1,
        type: payload.type,
        slug: payload.slug,
        title: payload.title,
        status: payload.status,
        body: payload.body as Prisma.InputJsonValue,
        publishedAt: payload.status === ContentStatus.published ? new Date() : null
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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
