export type CategorySlug = "laptop";
export type Availability = "in_stock" | "out_of_stock" | "preorder" | "upcoming" | "call_for_price" | "unknown";

export interface RawListing {
  url: string;
  externalId?: string;
  title: string;
  brand?: string;
  mpn?: string;
  price: number | null;
  regularPrice?: number | null;
  availability: Availability;
  imageUrl?: string;
  specs: Record<string, string>;
  scrapedAt: string;
  sourceCollection?: string;
  sourceRank?: number;
}

export interface StoreAdapter {
  id: string;
  name: string;
  baseUrl: string;
  sitemapUrl: string;
  productPathPattern: RegExp;
  categoryPath: Record<CategorySlug, string>;
  discover(category: CategorySlug, limit: number): AsyncIterable<string>;
  scrape(url: string): Promise<RawListing>;
}
