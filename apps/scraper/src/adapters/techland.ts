import { SitemapJsonLdAdapter } from "@/apps/scraper/src/adapters/sitemap-store";
import { StoreFetcher } from "@/apps/scraper/src/core/fetcher";

export function createTechlandAdapter(fetcher = new StoreFetcher()) {
  return new SitemapJsonLdAdapter({
    id: "techland",
    name: "Techland BD",
    baseUrl: "https://www.techlandbd.com",
    sitemapUrl: "https://www.techlandbd.com/sitemap.xml",
    productPathPattern: /^\/[^/]+laptop(?:$|[-/])/i,
    categoryPath: { laptop: "/best-recommended-laptop" },
    discoveryPages: [
      "/best-recommended-laptop",
      "/best-seller-laptop",
      "/best-sell-product",
      "/shop-laptop-computer/brand-laptops",
    ],
    requireProductIdentifier: true,
    fetcher,
  });
}
