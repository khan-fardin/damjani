import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/index";
import { brands, listings, matchReviews, products, stores, variants } from "@/db/schema";
import { scoreLaptopCandidate, type CanonicalCandidate } from "@/apps/scraper/src/core/match-attributes";

async function main() {
  const listingsToReview = await db.select({
    id: listings.id,
    title: listings.rawTitle,
    specs: listings.rawSpecs,
    storeName: stores.name,
  }).from(listings).innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(eq(listings.isActive, true), isNull(listings.variantId), eq(listings.matchStatus, "unmatched")));

  const canonicalRows = await db.select({
    id: variants.id,
    variant: variants.label,
    specs: variants.specs,
    product: products.name,
    brand: brands.name,
  }).from(variants).innerJoin(products, eq(variants.productId, products.id)).innerJoin(brands, eq(products.brandId, brands.id));
  const candidates = canonicalRows.map((row) => ({ ...row, id: Number(row.id) }));
  const rejectedRows = await db.select({ listingId: matchReviews.listingId, variantId: matchReviews.suggestedVariant })
    .from(matchReviews).where(eq(matchReviews.status, "rejected"));
  const rejectedByListing = new Map<number, Set<number>>();
  for (const row of rejectedRows) {
    if (row.variantId === null) continue;
    const blocked = rejectedByListing.get(row.listingId) ?? new Set<number>();
    blocked.add(row.variantId);
    rejectedByListing.set(row.listingId, blocked);
  }
  let queued = 0;

  for (const listing of listingsToReview) {
    const ranked = candidates.map((candidate) => ({
      candidate,
      result: scoreLaptopCandidate({ title: listing.title, specs: listing.specs }, candidate as CanonicalCandidate),
    })).filter((item): item is typeof item & { result: NonNullable<typeof item.result> } => item.result !== null)
      .sort((a, b) => b.result.score - a.result.score);
    const rejected = rejectedByListing.get(listing.id) ?? new Set<number>();
    const best = ranked.find((item) => !rejected.has(item.candidate.id));
    if (!best || best.result.score < 0.70) continue;

    const [existing] = await db.select({ id: matchReviews.id }).from(matchReviews)
      .where(and(eq(matchReviews.listingId, listing.id), eq(matchReviews.status, "open"))).limit(1);
    const review = {
      suggestedVariant: best.candidate.id,
      score: best.result.score.toFixed(3),
      reasons: { signals: best.result.reasons, store: listing.storeName },
      status: "open",
    };
    if (existing) await db.update(matchReviews).set(review).where(eq(matchReviews.id, existing.id));
    else await db.insert(matchReviews).values({ listingId: listing.id, ...review });
    await db.update(listings).set({ matchStatus: "pending_review", matchConfidence: best.result.score.toFixed(3) }).where(eq(listings.id, listing.id));
    queued += 1;
  }

  process.stdout.write(`Queued ${queued} uncertain laptop listing(s) for manual review.\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
