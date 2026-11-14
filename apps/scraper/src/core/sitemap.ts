import { StoreFetcher } from "@/apps/scraper/src/core/fetcher";

function locations(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim().replaceAll("&amp;", "&"));
}

export async function sitemapUrls(fetcher: StoreFetcher, sitemapUrl: string, maxSitemaps = 8): Promise<string[]> {
  const visited = new Set<string>();
  const pages: string[] = [];
  const pending = [sitemapUrl];
  while (pending.length && visited.size < maxSitemaps) {
    const url = pending.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    const xml = await fetcher.text(url);
    const found = locations(xml);
    if (/<sitemapindex\b/i.test(xml)) pending.push(...found);
    else pages.push(...found);
  }
  return pages;
}
