import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { notDeletedContentWhere } from "@/lib/content-document-scope";
import { getSessionUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePublicSlug, type SlugContentType } from "@/lib/slug-validation";

const statusSchema = z.enum(["draft", "published"]);

const querySchema = z.object({
  parentSlug: z.string().min(1),
  status: statusSchema
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const parentSlugRaw = request.nextUrl.searchParams.get("parentSlug");
    const statusRaw = request.nextUrl.searchParams.get("status");

    const parsed = querySchema.safeParse({
      parentSlug: parentSlugRaw ?? "",
      status: statusRaw ?? "draft"
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid query", issues: parsed.error.issues }, { status: 400 });
    }

    const parentSlug = parsed.data.parentSlug.trim();
    const status = parsed.data.status;

    const slugCheck = validatePublicSlug(parentSlug, "page" as SlugContentType);
    if (!slugCheck.ok) {
      return NextResponse.json({ error: slugCheck.message }, { status: 400 });
    }

    const prefix = `${parentSlug}/`;
    const candidates = await prisma.contentDocument.findMany({
      where: {
        ...notDeletedContentWhere,
        type: "page",
        status,
        slug: { startsWith: prefix }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        portfolioOrder: true,
        updatedAt: true,
        createdAt: true
      }
    });

    const children = candidates
      .map((d) => {
        const rest = d.slug.slice(prefix.length);
        return { ...d, rest };
      })
      .filter((d) => d.rest.length > 0 && !d.rest.includes("/"));

    return NextResponse.json({
      items: children.map((child) => ({
        id: child.id,
        slug: child.slug,
        title: child.title,
        portfolioOrder: child.portfolioOrder,
        status,
        createdAt: child.createdAt.toISOString(),
        updatedAt: child.updatedAt.toISOString()
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

