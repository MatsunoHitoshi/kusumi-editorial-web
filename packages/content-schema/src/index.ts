import { z } from "zod";

const contentTypeSchema = z.enum(["page", "article", "project", "reading"]);
const statusSchema = z.enum(["draft", "published"]);

export const tiptapDocSchema = z.object({
  type: z.string(),
  content: z.array(z.unknown()).optional()
});

export const baseContentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  type: contentTypeSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  status: statusSchema,
  body: tiptapDocSchema,
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional()
});

export const publishSnapshotSchema = z.object({
  version: z.string().regex(/^\d{14}$/),
  generatedAt: z.string().datetime(),
  pages: z.array(baseContentSchema.extend({ type: z.literal("page") })),
  articles: z.array(baseContentSchema.extend({ type: z.literal("article") })),
  projects: z.array(baseContentSchema.extend({ type: z.literal("project") })),
  readings: z.array(baseContentSchema.extend({ type: z.literal("reading") }))
});

export const publishSnapshotEnvelopeSchema = z.object({
  publishVersion: z.string().regex(/^\d{14}$/),
  snapshot: publishSnapshotSchema
});

export type BaseContent = z.infer<typeof baseContentSchema>;
export type PublishSnapshot = z.infer<typeof publishSnapshotSchema>;
export type PublishSnapshotEnvelope = z.infer<typeof publishSnapshotEnvelopeSchema>;
