import type { Metadata } from "next";

import type { BaseContent } from "@kusumi/content-schema";

import { siteConfig } from "./site-config";
import { tiptapToPlainParagraphs } from "./tiptap-plain";

export function metadataForContent(doc: BaseContent): Metadata {
  const fromBody = tiptapToPlainParagraphs(doc.body).find((p) => p.length > 0);
  const description =
    fromBody && fromBody.length > 0
      ? fromBody.length > 160
        ? `${fromBody.slice(0, 157)}…`
        : fromBody
      : siteConfig.description;

  return {
    title: doc.title,
    description,
    openGraph: {
      title: doc.title,
      description,
      type: "article"
    }
  };
}
