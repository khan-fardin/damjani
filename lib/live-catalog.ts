import "server-only";
import { neon } from "@neondatabase/serverless";
import { unstable_cache } from "next/cache";
import { drizzle } from "drizzle-orm/neon-http";
import { and, asc, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { ProductSummary, StoreOffer } from "@/lib/types";
import { LIVE_CATALOG_CACHE_TAG } from "@/lib/cache-tags";

async function queryLiveCatalog(databaseUrl: string): Promise<ProductSummary[]> {
  const db = drizzle(neon(databaseUrl), { schema });
  const rows = await db.select({
    productId: schema.products.id,
    slug: schema.products.slug,
    name: schema.products.name,
    description: schema.products.description,
    brand: schema.brands.name,
    variantId: schema.variants.id,
    variantSlug: schema.variants.slug,
    variantLabel: schema.variants.label,
    specs: schema.variants.specs,
    storeName: schema.stores.name,
    price: schema.listings.currentPrice,
    regularPrice: schema.listings.regularPrice,
    availability: schema.listings.availability,
    url: schema.listings.url,
    scrapedAt: schema.listings.lastScrapedAt,
  }).from(schema.products)
    .innerJoin(schema.brands, eq(schema.products.brandId, schema.brands.id))
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .innerJoin(schema.variants, eq(schema.variants.productId, schema.products.id))
    .innerJoin(schema.listings, eq(schema.listings.variantId, schema.variants.id))
    .innerJoin(schema.stores, eq(schema.listings.storeId, schema.stores.id))
    .where(and(eq(schema.categories.slug, "laptop"), eq(schema.listings.isActive, true)))
    .orderBy(asc(schema.products.id));

  const grouped = new Map<number, ProductSummary>();
  for (const row of rows) {
    let product = grouped.get(row.productId);
    if (!product) {
      const variant = { id: String(row.variantId), label: row.variantLabel, specs: row.specs };
      product = {
        slug: row.slug,
        name: row.name,
        brand: row.brand,
        category: "Laptops",
        series: row.name.replace(new RegExp(`^${row.brand}\\s*`, "i"), ""),
        image: "laptop-blue",
        description: row.description ?? `${row.brand} laptop. Compare current store offers below.`,
        variants: [variant],
        offers: { [variant.id]: [] },
      };
      grouped.set(row.productId, product);
    }
    const variantId = String(row.variantId);
    const offer: StoreOffer = {
      store: row.storeName,
      price: row.price,
      ...(row.regularPrice ? { regularPrice: row.regularPrice } : {}),
      availability: row.availability,
      updated: row.scrapedAt ? row.scrapedAt.toLocaleString("en-BD") : "Unknown",
      url: row.url,
      history: [],
    };
    product.offers[variantId].push(offer);
  }

  return [...grouped.values()].map((product) => ({
    ...product,
    offers: Object.fromEntries(Object.entries(product.offers).map(([variantId, offers]) => [
      variantId,
      [...offers].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)),
    ])),
  }));
}

const getCachedLiveCatalog = unstable_cache(queryLiveCatalog, ["damjani-live-catalog-v1"], {
  revalidate: 900,
  tags: [LIVE_CATALOG_CACHE_TAG],
});

export async function getLiveCatalog(): Promise<ProductSummary[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return [];
  try {
    return await getCachedLiveCatalog(databaseUrl);
  } catch (error) {
    console.error("Unable to load the Damjani catalog from Neon:", error);
    return [];
  }
}

export async function getLiveProduct(slug: string): Promise<ProductSummary | undefined> {
  return (await getLiveCatalog()).find((product) => product.slug === slug);
}
