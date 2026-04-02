import { z } from "zod";

const contentTypeSchema = z.enum(["page", "article", "project", "reading", "publication"]);
const statusSchema = z.enum(["draft", "published"]);

export const tiptapDocSchema = z.object({
  type: z.string(),
  content: z.array(z.unknown()).optional()
});

export const pageDisplayModeSchema = z.enum(["normal", "toc", "portfolio"]);

export const baseContentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  type: contentTypeSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  status: statusSchema,
  body: tiptapDocSchema,
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  /** type=page のときのみ公開スナップショットに載る。未設定はサイト側で normal 扱い */
  pageDisplayMode: pageDisplayModeSchema.optional(),
  /** type=page のポートフォリオ表示順序。未設定は末尾 */
  portfolioOrder: z.number().int().nonnegative().optional()
});

export const pageContentSchema = baseContentSchema.extend({
  type: z.literal("page")
});

export const publishSnapshotSchema = z.object({
  version: z.string().regex(/^\d{14}$/),
  generatedAt: z.string().datetime(),
  pages: z.array(pageContentSchema),
  articles: z.array(baseContentSchema.extend({ type: z.literal("article") })),
  projects: z.array(baseContentSchema.extend({ type: z.literal("project") })),
  readings: z.array(baseContentSchema.extend({ type: z.literal("reading") })),
  publications: z.array(baseContentSchema.extend({ type: z.literal("publication") }))
});

export const publishSnapshotEnvelopeSchema = z.object({
  publishVersion: z.string().regex(/^\d{14}$/),
  snapshot: publishSnapshotSchema
});

export type BaseContent = z.infer<typeof baseContentSchema>;
export type PageContent = z.infer<typeof pageContentSchema>;
export type PageDisplayMode = z.infer<typeof pageDisplayModeSchema>;
export type PublishSnapshot = z.infer<typeof publishSnapshotSchema>;
export type PublishSnapshotEnvelope = z.infer<typeof publishSnapshotEnvelopeSchema>;
