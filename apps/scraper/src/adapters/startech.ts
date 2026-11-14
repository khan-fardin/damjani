import { SitemapJsonLdAdapter } from "@/apps/scraper/src/adapters/sitemap-store";
import { StoreFetcher } from "@/apps/scraper/src/core/fetcher";

export function createStarTechAdapter(fetcher = new StoreFetcher()) {
  return new SitemapJsonLdAdapter({
    id: "startech",
    name: "Star Tech",
    baseUrl: "https://www.startech.com.bd",
    sitemapUrl: "https://www.startech.com.bd/sitemap.xml",
    productPathPattern: /^\/[^/]+(?:laptop|notebook)(?:$|[-/])/i,
    categoryPath: { laptop: "/laptop-notebook/laptop" },
    fetcher,
  });
}
