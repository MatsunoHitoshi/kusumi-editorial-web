import { NextResponse } from "next/server";
import { getSessionUser, requireRole } from "@/lib/auth";
import { getPublishPreviewSummary } from "@/lib/content";

export async function GET() {
  try {
    const user = await getSessionUser();
    requireRole(user, "admin");

    const summary = await getPublishPreviewSummary();
    return NextResponse.json(summary);
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
