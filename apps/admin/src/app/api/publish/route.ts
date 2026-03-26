import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { PublishSnapshotEnvelope } from "@kusumi/content-schema";
import { getLatestPublishVersionTag, getPublishSnapshot } from "@/lib/content";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-publish-token");
  if (token !== env.PUBLISH_API_TOKEN) {
    return unauthorized();
  }

  const rawVersion = request.nextUrl.searchParams.get("publishVersion");
  if (!rawVersion) {
    return NextResponse.json({ error: "publishVersion is required" }, { status: 400 });
  }

  let publishVersion = rawVersion;
  if (rawVersion === "latest") {
    const tag = await getLatestPublishVersionTag();
    if (!tag) {
      return NextResponse.json(
        { error: "no published documents with a publishVersion; run 公開反映 first" },
        { status: 404 }
      );
    }
    publishVersion = tag;
  }

  const snapshot = await getPublishSnapshot(publishVersion);

  const envelope: PublishSnapshotEnvelope = {
    publishVersion,
    snapshot
  };

  return NextResponse.json(envelope);
}
