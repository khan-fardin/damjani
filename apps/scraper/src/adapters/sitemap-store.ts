import type { CategorySlug, RawListing, StoreAdapter } from "@/apps/scraper/src/adapters/types";
import { StoreFetcher } from "@/apps/scraper/src/core/fetcher";
import { parseProductHtml } from "@/apps/scraper/src/core/parse-product";
import { sitemapUrls } from "@/apps/scraper/src/core/sitemap";

export class SitemapJsonLdAdapter implements StoreAdapter {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly sitemapUrl: string;
  readonly productPathPattern: RegExp;
  readonly categoryPath: Record<CategorySlug, string>;
  readonly discoveryPages: string[];
  readonly requireProductIdentifier: boolean;
  private readonly fetcher: StoreFetcher;

  constructor(config: {
    id: string;
    name: string;
    baseUrl: string;
    sitemapUrl: string;
    productPathPattern: RegExp;
    categoryPath: Record<CategorySlug, string>;
    discoveryPages?: string[];
    requireProductIdentifier?: boolean;
    fetcher: StoreFetcher;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.sitemapUrl = config.sitemapUrl;
    this.productPathPattern = config.productPathPattern;
    this.categoryPath = config.categoryPath;
    this.discoveryPages = config.discoveryPages ?? [];
    this.requireProductIdentifier = config.requireProductIdentifier ?? false;
    this.fetcher = config.fetcher;
  }

  async *discover(category: CategorySlug, limit: number): AsyncIterable<string> {
    if (this.discoveryPages.length) {
      const seen = new Set<string>();
      let yielded = 0;
      for (const path of this.discoveryPages) {
        const html = await this.fetcher.text(new URL(path, this.baseUrl).toString());
        const anchors = html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
        for (const anchor of anchors) {
          const body = anchor[2].replace(/<[^>]*>/g, " ").replace(/&amp;/g, " ");
          if (!/laptop|notebook/i.test(`${anchor[0]} ${body}`)) continue;
          let candidate: URL;
          try { candidate = new URL(anchor[1].replace(/&amp;/g, "&"), this.baseUrl); } catch { continue; }
          const parts = candidate.pathname.split("/").filter(Boolean);
          if (candidate.hostname !== new URL(this.baseUrl).hostname || candidate.search || parts.length !== 1) continue;
          if (/^(shop-laptop-computer|laptop|search|login|account|compare|wishlist)$/i.test(parts[0])) continue;
          if (this.discoveryPages.some((entry) => candidate.pathname === new URL(entry, this.baseUrl).pathname)) continue;
          const key = candidate.toString().replace(/\/$/, "");
          if (seen.has(key)) continue;
          seen.add(key);
          if (!await this.fetcherAllowed(candidate)) continue;
          yield candidate.toString();
          yielded += 1;
          if (yielded >= limit) return;
        }
      }
      return;
    }
    const categoryPath = this.categoryPath[category].toLowerCase();
    const candidates = await sitemapUrls(this.fetcher, this.sitemapUrl);
    let yielded = 0;
    for (const candidate of candidates) {
      const url = new URL(candidate, this.baseUrl);
      if (url.hostname !== new URL(this.baseUrl).hostname) continue;
      if (url.search || url.pathname.toLowerCase() === categoryPath || !this.productPathPattern.test(url.pathname)) continue;
      if (!await this.fetcherAllowed(url)) continue;
      yield url.toString();
      yielded += 1;
      if (yielded >= limit) return;
    }
  }

  async scrape(url: string): Promise<RawListing> {
    const parsed = new URL(url);
    if (parsed.hostname !== new URL(this.baseUrl).hostname) throw new Error("Refusing to request a URL outside the adapter's store domain.");
    const html = await this.fetcher.text(parsed.toString());
    const listing = parseProductHtml(parsed.toString(), html);
    if (this.requireProductIdentifier && !listing.externalId && !listing.mpn) {
      throw new Error("Page lacks a product identifier; skipping non-product collection pages.");
    }
    return listing;
  }

  private async fetcherAllowed(url: URL) {
    try {
      await this.fetcher.checkAllowed(url);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("robots.txt disallows")) return false;
      throw error;
    }
  }
}
