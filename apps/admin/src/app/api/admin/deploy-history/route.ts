import { NextResponse } from "next/server";
import type { SiteDeployHistory } from "@prisma/client";
import { getSessionUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getSessionUser();
    requireRole(user, "admin");

    const [latestSuccessful, recent] = await Promise.all([
      prisma.siteDeployHistory.findFirst({
        where: { status: "succeeded" },
        orderBy: [{ finishedAt: "desc" }, { queuedAt: "desc" }]
      }),
      prisma.siteDeployHistory.findMany({
        orderBy: [{ queuedAt: "desc" }],
        take: 20
      })
    ]);

    const toItem = (row: SiteDeployHistory) => ({
      id: row.id,
      publishVersion: row.publishVersion,
      status: row.status,
      queuedAt: row.queuedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
      triggeredBy: row.triggeredBy ?? null,
      reason: row.reason ?? null,
      githubRunId: row.githubRunId ?? null,
      githubRunAttempt: row.githubRunAttempt ?? null,
      githubRunUrl: row.githubRunUrl ?? null,
      buildConclusion: row.buildConclusion ?? null,
      deployConclusion: row.deployConclusion ?? null
    });

    return NextResponse.json({
      latestSuccessful: latestSuccessful ? toItem(latestSuccessful) : null,
      recent: recent.map(toItem)
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

