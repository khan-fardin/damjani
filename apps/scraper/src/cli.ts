import { and, eq, isNull } from "drizzle-orm";
import { createStarTechAdapter } from "@/apps/scraper/src/adapters/startech";
import { createTechlandAdapter } from "@/apps/scraper/src/adapters/techland";
import type { CategorySlug, StoreAdapter } from "@/apps/scraper/src/adapters/types";
import { validateListing } from "@/apps/scraper/src/core/validate";
import { db } from "@/db/index";
import { listings, scrapeRuns, stores } from "@/db/schema";
import { persistListing } from "@/apps/scraper/src/lib/persist-listing";

const adapters: Record<string, () => StoreAdapter> = {
  startech: createStarTechAdapter,
  techland: createTechlandAdapter,
};

function option(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const storeKey = process.argv[2];
  if (!storeKey || !adapters[storeKey]) {
    throw new Error("Usage: npm run scrape -- <startech|techland> --category laptop [--limit 10]");
  }
  const category = option("--category", "laptop");
  if (category !== "laptop") throw new Error("The first proof of concept supports --category laptop only.");
  const limit = Math.min(50, Math.max(1, Number(option("--limit", "10")) || 10));
  const adapter = adapters[storeKey]();

  const [store] = await db.insert(stores).values({
    slug: adapter.id,
    name: adapter.name,
    baseUrl: adapter.baseUrl,
    isActive: true,
  }).onConflictDoUpdate({
    target: stores.slug,
    set: { name: adapter.name, baseUrl: adapter.baseUrl, isActive: true },
  }).returning({ id: stores.id });

  const [run] = await db.insert(scrapeRuns).values({ storeId: store.id, jobType: `discover-refresh:${category}` }).returning({ id: scrapeRuns.id });
  let attempted = 0;
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  let errorSample: string | null = null;

  try {
    for await (const url of adapter.discover(category as CategorySlug, Math.min(100, limit * 2))) {
      if (succeeded >= limit) break;
      attempted += 1;
      try {
        const listing = await adapter.scrape(url);
        if (storeKey === "techland") {
          listing.sourceCollection = "techland-curated-laptop-collections";
          listing.sourceRank = succeeded + 1;
        }
        validateListing(listing, adapter.baseUrl);
        await persistListing(store.id, listing);
        succeeded += 1;
        process.stdout.write(`Saved: ${listing.title}\n`);
      } catch (error) {
        const detail = error instanceof Error ? `${url}: ${error.message}` : `${url}: unknown error`;
        if (detail.includes("Page lacks a product identifier")) {
          skipped += 1;
          await db.update(listings).set({ isActive: false })
            .where(and(eq(listings.storeId, store.id), eq(listings.url, url), isNull(listings.externalId)));
          process.stderr.write(`Ignored non-product page: ${detail}\n`);
        } else {
          failed += 1;
          errorSample ??= detail;
          process.stderr.write(`Failed: ${detail}\n`);
        }
      }
    }
  } catch (error) {
    failed += 1;
    errorSample ??= error instanceof Error ? error.message : "Unknown scrape error";
    process.stderr.write(`Run stopped: ${errorSample}\n`);
  } finally {
    await db.update(scrapeRuns).set({
      finishedAt: new Date(), attempted, succeeded, failed, errorSample,
    }).where(eq(scrapeRuns.id, run.id));
  }

  process.stdout.write(`Finished ${adapter.name}: ${succeeded}/${attempted} listings saved (${skipped} non-product pages ignored, ${failed} failed).\n`);
  if (failed > 0) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
import { eq } from "drizzle-orm";
