import { z } from "zod";

const envSchema = z.object({
  PUBLISH_API_TOKEN: z.string().min(1).default("dev-token"),
  GITHUB_OWNER: z.string().min(1).default("owner"),
  GITHUB_REPO: z.string().min(1).default("repo"),
  ADMIN_DISPATCH_TOKEN: z.string().min(1).default("dev-dispatch-token"),
  SUPABASE_URL: z.string().url().default("https://example.supabase.co"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default("dev-service-role"),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("content-images")
});

export const env = envSchema.parse({
  PUBLISH_API_TOKEN: process.env.PUBLISH_API_TOKEN,
  GITHUB_OWNER: process.env.GITHUB_OWNER,
  GITHUB_REPO: process.env.GITHUB_REPO,
  ADMIN_DISPATCH_TOKEN: process.env.ADMIN_DISPATCH_TOKEN,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET
});
