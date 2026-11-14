import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/index";
import { brands, categories, listings, products, stores, variants } from "@/db/schema";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
}

function displayName(value: string) {
  return value.replace(/\s*\|\s*(?:techland\s*bd|star\s*tech).*$/i, "")
    .replace(/\s+(?:laptop\s+)?price\s+(?:in|at)\s+(?:bd|bangladesh)(?:\s+\d{4})?$/i, "")
    .replace(/\s+/g, " ").trim();
}

function brandFromTitle(title: string) {
  const first = title.trim().split(/\s+/)[0].replace(/[^a-z]/gi, "").toLowerCase();
  const known: Record<string, string> = {
    acer: "Acer", msi: "MSI", lenovo: "Lenovo", hp: "HP", tecno: "Tecno", asus: "ASUS", dell: "Dell", apple: "Apple",
  };
  return known[first] ?? first.toUpperCase();
}

async function main() {
  const [category] = await db.insert(categories).values({ slug: "laptop", name: "Laptops" })
    .onConflictDoUpdate({ target: categories.slug, set: { name: "Laptops" } }).returning({ id: categories.id });
  const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, "techland")).limit(1);
  if (!store) throw new Error("Scrape Techland BD listings before seeding the canonical catalog.");

  const rows = await db.select({ id: listings.id, title: listings.rawTitle, imageUrl: listings.imageUrl, rawMpn: listings.rawMpn, rawSpecs: listings.rawSpecs, lastScrapedAt: listings.lastScrapedAt })
    .from(listings)
    .where(and(eq(listings.storeId, store.id), eq(listings.isActive, true), isNotNull(listings.externalId)));
  const candidates = rows.filter((row) => row.rawSpecs._sourceCollection === "techland-curated-laptop-collections")
    .sort((a, b) => new Date(b.lastScrapedAt ?? 0).getTime() - new Date(a.lastScrapedAt ?? 0).getTime());
  const latestByRank = new Map<number, typeof candidates[number]>();
  for (const row of candidates) {
    const rank = Number(row.rawSpecs._sourceRank);
    if (rank > 0 && rank <= 20 && !latestByRank.has(rank)) latestByRank.set(rank, row);
  }
  const canonicalRows = [...latestByRank.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
  const selectedIds = new Set(canonicalRows.map((row) => row.id));
  for (const stale of candidates.filter((row) => !selectedIds.has(row.id))) {
    await db.update(listings).set({ isActive: false, variantId: null, matchStatus: "unmatched", matchConfidence: null })
      .where(eq(listings.id, stale.id));
  }

  for (const row of canonicalRows) {
    const brandName = brandFromTitle(row.title);
    const brandSlug = slugify(brandName);
    const [brand] = await db.insert(brands).values({ slug: brandSlug, name: brandName })
      .onConflictDoUpdate({ target: brands.slug, set: { name: brandName } }).returning({ id: brands.id });
    const productName = displayName(row.title);
    const productSlug = slugify(productName);
    const [product] = await db.insert(products).values({
      slug: productSlug,
      name: productName,
      brandId: brand.id,
      categoryId: category.id,
      imageUrl: row.imageUrl,
      description: `Compare current store offers for this ${brandName} laptop configuration. Confirm price and availability with the retailer.`,
    }).onConflictDoUpdate({
      target: products.slug,
      set: { name: productName, brandId: brand.id, categoryId: category.id, imageUrl: row.imageUrl, description: `Compare current store offers for this ${brandName} laptop configuration. Confirm price and availability with the retailer.` },
    }).returning({ id: products.id });

    const variantSlug = `${productSlug}-listed-configuration`.slice(0, 180);
    const variantSpecs = Object.fromEntries(Object.entries(row.rawSpecs).filter(([key]) => !key.startsWith("_")));
    const [variant] = await db.insert(variants).values({
      productId: product.id,
      slug: variantSlug,
      label: "Configuration as listed",
      mpn: row.rawMpn,
      specs: variantSpecs,
    }).onConflictDoUpdate({
      target: variants.slug,
      set: { productId: product.id, label: "Configuration as listed", mpn: row.rawMpn, specs: variantSpecs },
    }).returning({ id: variants.id });

    await db.update(listings).set({ variantId: variant.id, matchStatus: "matched_auto", matchConfidence: "1.000" })
      .where(eq(listings.id, row.id));
  }

  process.stdout.write(`Seeded ${canonicalRows.length} canonical laptop configurations from Techland BD.\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
