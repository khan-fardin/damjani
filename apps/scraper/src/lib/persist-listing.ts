import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { listings, priceSnapshots } from "@/db/schema";
import type { RawListing } from "@/apps/scraper/src/adapters/types";

export async function persistListing(storeId: number, listing: RawListing) {
  const now = new Date(listing.scrapedAt);
  const [existing] = await db.select().from(listings)
    .where(and(eq(listings.storeId, storeId), eq(listings.url, listing.url)))
    .limit(1);
  const changed = !existing || existing.currentPrice !== listing.price || existing.availability !== listing.availability;
  const values = {
    storeId,
    url: listing.url,
    externalId: listing.externalId ?? null,
    rawTitle: listing.title,
    rawMpn: listing.mpn ?? null,
    rawSpecs: {
      ...listing.specs,
      ...(listing.sourceCollection ? { _sourceCollection: listing.sourceCollection } : {}),
      ...(listing.sourceRank ? { _sourceRank: String(listing.sourceRank) } : {}),
    },
    imageUrl: listing.imageUrl ?? null,
    currentPrice: listing.price,
    regularPrice: listing.regularPrice ?? null,
    availability: listing.availability,
    lastScrapedAt: now,
    lastChangedAt: changed ? now : existing?.lastChangedAt ?? now,
    isActive: true,
  };

  let listingId: number;
  if (existing) {
    await db.update(listings).set(values).where(eq(listings.id, existing.id));
    listingId = existing.id;
  } else {
    const [created] = await db.insert(listings).values({ ...values, matchStatus: "unmatched" }).returning({ id: listings.id });
    listingId = created.id;
  }

  if (changed) {
    await db.insert(priceSnapshots).values({
      listingId,
      price: listing.price,
      regularPrice: listing.regularPrice ?? null,
      availability: listing.availability,
      scrapedAt: now,
    });
  }
  return { listingId, changed };
}
