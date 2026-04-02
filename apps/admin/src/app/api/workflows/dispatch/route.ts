import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { createPublishVersion } from "@/lib/publish-version";
import { getSessionUser, requireRole } from "@/lib/auth";
import { env } from "@/lib/env";
import { assignPublishVersion } from "@/lib/content";
import { findNpmWorkspaceRoot } from "@/lib/repo-root";

const dispatchSchema = z.object({
  reason: z.string().max(200).optional(),
  fullRebuild: z.boolean().default(true),
  contentTypes: z
    .array(z.enum(["pages", "articles", "projects", "reading", "publications"]))
    .default(["pages", "articles", "projects", "reading", "publications"]),
  confirmPublication: z.literal(true, {
    errorMap: () => ({ message: "公開反映の最終確認に同意してください" })
  })
});

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, "admin");

    const body = dispatchSchema.parse(await request.json());
    const publishVersion = createPublishVersion();
    const publishedCount = await assignPublishVersion(publishVersion);

    const shouldRunLocalBuild =
      process.env.NODE_ENV !== "production" ||
      // ローカル検証用のダミー値を置いている場合も、必ずローカル build 側へフォールバック
      env.ADMIN_DISPATCH_TOKEN.startsWith("dev-") ||
      env.GITHUB_OWNER.startsWith("dummy-") ||
      env.GITHUB_REPO.startsWith("dummy-");

    const payload = {
      ref: "main",
      inputs: {
        triggeredBy: user.email,
        publishVersion,
        contentTypes: JSON.stringify(body.contentTypes),
        fullRebuild: body.fullRebuild ? "true" : "false",
        reason: body.reason ?? ""
      }
    };

    // GitHub Pages へのデプロイを行わず、ローカルで静的成果物を生成して挙動確認できるようにする
    if (shouldRunLocalBuild) {
      const repoRoot = findNpmWorkspaceRoot(process.cwd());
      const origin = request.headers.get("origin");
      const publishApiBaseUrl =
        process.env.PUBLISH_API_BASE_URL ??
        (origin ? origin.replace(/\/$/, "") : undefined) ??
        "http://127.0.0.1:3001";

      // admin の next dev から NODE_ENV=development が継承されると next build が壊れる（Html/useContext 等）
      const buildEnv: NodeJS.ProcessEnv = {
        ...process.env,
        PUBLISH_API_BASE_URL: publishApiBaseUrl,
        PUBLISH_API_TOKEN: env.PUBLISH_API_TOKEN,
        PUBLISH_VERSION: publishVersion,
        NODE_ENV: "production"
      };

      try {
        await execFileAsync(
          "npm",
          ["--workspace", "@kusumi/site", "run", "build"],
          {
            cwd: repoRoot,
            env: buildEnv,
            windowsHide: true,
            timeout: 60 * 10 * 1000,
            maxBuffer: 50 * 1024 * 1024
          }
        );
      } catch (buildErr) {
        const rawStderr =
          buildErr && typeof buildErr === "object" && "stderr" in buildErr
            ? (buildErr as { stderr?: unknown }).stderr
            : undefined;
        const stderr =
          typeof rawStderr === "string"
            ? rawStderr
            : Buffer.isBuffer(rawStderr)
              ? rawStderr.toString("utf8")
              : "";
        const message = buildErr instanceof Error ? buildErr.message : String(buildErr);
        const detail = [message, stderr].filter(Boolean).join("\n").slice(0, 8000);
        console.error("[workflows/dispatch] local build failed", detail);
        return NextResponse.json(
          {
            error: "local build failed",
            detail,
            publishVersion,
            publishedCount
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        publishVersion,
        publishedCount,
        localBuild: true
      });
    }

    const response = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/deploy-site.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${env.ADMIN_DISPATCH_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "workflow dispatch failed", detail: text, publishVersion },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, publishVersion, publishedCount });
  } catch (error) {
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
