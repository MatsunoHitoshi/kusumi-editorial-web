import type { MetadataRoute } from "next";

import { fetchPublishSnapshot } from "@/lib/publish-client";
import { getSiteOrigin } from "@/lib/site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();
  const envelope = await fetchPublishSnapshot();
  const snap = envelope.snapshot;

  const routes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(snap.generatedAt),
      changeFrequency: "weekly",
      priority: 1
    }
  ];

  for (const p of snap.pages) {
    routes.push({
      url: `${base}/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.8
    });
  }
  for (const a of snap.articles) {
    routes.push({
      url: `${base}/articles/${a.slug}`,
      lastModified: new Date(a.updatedAt),
      changeFrequency: "weekly",
      priority: 0.9
    });
  }
  for (const p of snap.projects) {
    routes.push({
      url: `${base}/projects/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.8
    });
  }
  for (const r of snap.readings) {
    routes.push({
      url: `${base}/reading/${r.slug}`,
      lastModified: new Date(r.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7
    });
  }
  for (const pub of snap.publications) {
    routes.push({
      url: `${base}/publications/${pub.slug}`,
      lastModified: new Date(pub.updatedAt),
      changeFrequency: "monthly",
      priority: 0.8
    });
  }

  return routes;
}
