import type { MetadataRoute } from "next";
import { getLiveCatalog } from "@/lib/live-catalog";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getLiveCatalog();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/c/laptops`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/about`, changeFrequency: "monthly", priority: 0.4 },
  ];
  return [...staticRoutes, ...products.map((product) => ({
      url: `${siteConfig.url}/p/${product.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }))];
}
