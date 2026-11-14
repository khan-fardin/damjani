import type { RawListing } from "@/apps/scraper/src/adapters/types";

export function validateListing(listing: RawListing, baseUrl: string) {
  const expectedHost = new URL(baseUrl).hostname;
  const listingUrl = new URL(listing.url);
  if (listingUrl.hostname !== expectedHost) throw new Error(`Listing URL host ${listingUrl.hostname} does not match ${expectedHost}.`);
  if (!listing.title.trim()) throw new Error("Listing title is empty.");
  if (listing.price !== null && (!Number.isInteger(listing.price) || listing.price < 500 || listing.price > 5_000_000)) {
    throw new Error(`Price is outside the allowed range: ${listing.price}.`);
  }
  if (listing.regularPrice !== null && listing.regularPrice !== undefined && (!Number.isInteger(listing.regularPrice) || listing.regularPrice < 500 || listing.regularPrice > 5_000_000)) {
    throw new Error(`Regular price is outside the allowed range: ${listing.regularPrice}.`);
  }
}
