import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const callbackSchema = z.object({
  publishVersion: z.string().regex(/^\d{14}$/),
  stage: z.enum(["build", "deploy"]),
  conclusion: z.string().min(1),
  runId: z.string().min(1).optional(),
  runAttempt: z.number().int().positive().optional(),
  runUrl: z.string().url().optional()
});

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-deploy-callback-token");
    if (!token || token !== env.DEPLOY_CALLBACK_TOKEN) {
      return unauthorized();
    }

    const body = callbackSchema.parse(await request.json());

    const isSuccess = body.conclusion === "success";
    const isFailure = body.conclusion === "failure" || body.conclusion === "cancelled";

    const nextStatus: "building" | "deploying" | "succeeded" | "failed" =
      body.stage === "build"
        ? isSuccess
          ? "deploying"
          : "failed"
        : isSuccess
          ? "succeeded"
          : "failed";

    const finishedAt = nextStatus === "succeeded" || nextStatus === "failed" ? new Date() : null;

    const data: Parameters<typeof prisma.siteDeployHistory.update>[0]["data"] = {
      status: nextStatus,
      ...(finishedAt ? { finishedAt } : {}),
      ...(body.runId ? { githubRunId: body.runId } : {}),
      ...(typeof body.runAttempt === "number" ? { githubRunAttempt: body.runAttempt } : {}),
      ...(body.runUrl ? { githubRunUrl: body.runUrl } : {}),
      ...(body.stage === "build" ? { buildConclusion: body.conclusion } : { deployConclusion: body.conclusion })
    };

    const updated = await prisma.siteDeployHistory.update({
      where: { publishVersion: body.publishVersion },
      data
    });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid payload", issues: error.issues }, { status: 400 });
    }
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      // Record to update not found
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}

