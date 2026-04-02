import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { notDeletedContentWhere } from "@/lib/content-document-scope";
import { getSessionUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusSchema = z.enum(["draft", "published"]);

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const statusRaw = request.nextUrl.searchParams.get("status");
    const parsed = statusSchema.safeParse(statusRaw ?? "draft");
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const status = parsed.data;

    const items = await prisma.contentDocument.findMany({
      where: {
        ...notDeletedContentWhere,
        type: "publication",
        status
      },
      select: {
        id: true,
        slug: true,
        title: true,
        portfolioOrder: true,
        createdAt: true,
        updatedAt: true
      },
      // order はサイト側の最終表示ルールに合わせる（未設定は末尾）
      orderBy: [{ portfolioOrder: "asc" }, { title: "asc" }]
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        portfolioOrder: item.portfolioOrder,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }))
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

