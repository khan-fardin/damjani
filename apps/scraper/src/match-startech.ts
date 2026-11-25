import { and, eq, isNotNull } from "drizzle-orm";
import { createStarTechAdapter } from "@/apps/scraper/src/adapters/startech";
import type { RawListing } from "@/apps/scraper/src/adapters/types";
import { StoreFetcher } from "@/apps/scraper/src/core/fetcher";
import { sitemapUrls } from "@/apps/scraper/src/core/sitemap";
import { validateListing } from "@/apps/scraper/src/core/validate";
import { db } from "@/db/index";
import { listings, scrapeRuns, stores } from "@/db/schema";
import { persistListing } from "@/apps/scraper/src/lib/persist-listing";
import { revalidateSiteCatalog } from "@/apps/scraper/src/lib/revalidate-site";

type Target = { listingId: number; variantId: number; title: string; specs: Record<string, string> };

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function modelCodes(value: string) {
  const patterns = [
    /\b[A-Z]{1,3}\d{2,4}(?:-[A-Z0-9]{2,})+\b/gi,
    /\b\d{2}[A-Z]{2,4}\d{1,3}[A-Z0-9]*\b/gi,
    /\b\d{2}-[A-Z]{2}\d{3,}[A-Z0-9]*\b/gi,
    /\b[A-Z]\d[A-Z0-9]{3,}\b/gi,
    /\b[A-Z]\d{2,}[A-Z]{2,}\b/gi,
    /\bV\d{2}\b/gi,
  ];
  return [...new Set(patterns.flatMap((pattern) => [...value.matchAll(pattern)].map((match) => match[0])))].sort((a, b) => b.length - a.length);
}

function capacity(title: string, specs: Record<string, string>, kind: "ram" | "storage") {
  const relevant = Object.entries(specs).filter(([key]) => kind === "ram" ? /ram|memory/i.test(key) : /storage|ssd/i.test(key));
  const values = [...relevant.map(([, value]) => value), title];
  for (const value of values) {
    const match = value.match(kind === "ram" ? /(\d{1,2})\s*gb/i : /(\d+(?:\.\d+)?)\s*(gb|tb)/i);
    if (!match) continue;
    if (kind === "ram") return match[1];
    return String(Number(match[1]) * (match[2].toLowerCase() === "tb" ? 1024 : 1));
  }
  return null;
}

function cpu(value: string) {
  return value.match(/(?:core\s*)?i[3579][ -]?\d{4,5}[a-z]?|ryzen\s*(?:ai\s*)?[3579]\s*\d{3,5}[a-z]?|core\s*ultra\s*[3579]\s*\d{3,4}[a-z]?/i)?.[0]
    ?.toLowerCase().replace(/\s+/g, " ").trim() ?? null;
}

function cpuFamily(value: string) {
  const text = value.toLowerCase();
  return text.match(/core\s*ultra\s*[3579]|core\s*i[3579]|core\s*[3579]\b|i[3579]\b|ryzen\s*(?:ai\s*)?[3579]/i)?.[0]
    ?.replace(/\s+/g, " ").trim() ?? null;
}

function generation(value: string) {
  return value.match(/\b(?:gen(?:eration)?|g)\s*(\d{1,2})\b/i)?.[1] ?? null;
}

function exactConfiguration(target: Target, candidate: RawListing, code: string) {
  const candidateText = `${candidate.title} ${candidate.url} ${candidate.mpn ?? ""} ${candidate.externalId ?? ""} ${Object.entries(candidate.specs).map(([key, value]) => `${key} ${value}`).join(" ")}`;
  const normalizedCode = compact(code);
  const exactCode = modelCodes(candidateText).some((candidateCode) => compact(candidateCode) === normalizedCode);
  const targetText = `${target.title} ${Object.entries(target.specs).map(([key, value]) => `${key} ${value}`).join(" ")}`;
  const candidateDetails = `${candidate.title} ${Object.entries(candidate.specs).map(([key, value]) => `${key} ${value}`).join(" ")}`;
  const targetRam = capacity(target.title, target.specs, "ram");
  const foundRam = capacity(candidate.title, candidate.specs, "ram");
  const targetStorage = capacity(target.title, target.specs, "storage");
  const foundStorage = capacity(candidate.title, candidate.specs, "storage");
  const targetCpu = cpu(targetText);
  const foundCpu = cpu(candidateDetails);
  const targetFamily = cpuFamily(targetText);
  const foundFamily = cpuFamily(candidateDetails);
  const targetGeneration = generation(targetText);
  const foundGeneration = generation(candidateDetails);
  const compatibleSkuSuffix = modelCodes(candidateText).some((candidateCode) => {
    const normalizedCandidateCode = compact(candidateCode);
    const suffix = normalizedCandidateCode.slice(normalizedCode.length);
    return normalizedCandidateCode.startsWith(normalizedCode) && /^r\d+$/.test(suffix) && Boolean(targetCpu && foundCpu && targetCpu === foundCpu);
  });
  if (!exactCode && !compatibleSkuSuffix) return false;
  const knownSpecsMatch = (!targetRam || targetRam === foundRam)
    && (!targetStorage || targetStorage === foundStorage)
    && (!targetCpu || targetCpu === foundCpu)
    && (!targetFamily || targetFamily === foundFamily)
    && (!targetGeneration || targetGeneration === foundGeneration);
  return Boolean(knownSpecsMatch && ((targetRam && foundRam) || (targetStorage && foundStorage) || (targetCpu && foundCpu)));
}

async function main() {
  const fetcher = new StoreFetcher();
  const adapter = createStarTechAdapter(fetcher);
  const [techland] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, "techland")).limit(1);
  if (!techland) throw new Error("No Techland laptop listings found. Run the Techland scrape first.");
  const targets = await db.select({
    listingId: listings.id,
    variantId: listings.variantId,
    title: listings.rawTitle,
    brand: listings.rawTitle,
    specs: listings.rawSpecs,
  }).from(listings).where(and(eq(listings.storeId, techland.id), eq(listings.isActive, true), isNotNull(listings.variantId)));
  const canonicalTargets: Target[] = targets.filter((row) => row.specs._sourceCollection === "techland-curated-laptop-collections")
    .map((row) => ({ listingId: row.listingId, variantId: row.variantId!, title: row.title, specs: Object.fromEntries(Object.entries(row.specs).filter(([key]) => !key.startsWith("_"))) }));
  if (!canonicalTargets.length) throw new Error("Seed the Techland listings into the canonical catalog first.");

  const [starTech] = await db.insert(stores).values({ slug: adapter.id, name: adapter.name, baseUrl: adapter.baseUrl, isActive: true })
    .onConflictDoUpdate({ target: stores.slug, set: { name: adapter.name, baseUrl: adapter.baseUrl, isActive: true } }).returning({ id: stores.id });
  const [run] = await db.insert(scrapeRuns).values({ storeId: starTech.id, jobType: "match-refresh:laptops" }).returning({ id: scrapeRuns.id });
  const existingMatches = await db.select({ variantId: listings.variantId, id: listings.id }).from(listings)
    .where(and(eq(listings.storeId, starTech.id), eq(listings.matchStatus, "matched_auto"), isNotNull(listings.variantId)));
  let attempted = 0;
  let matched = 0;
  let failed = 0;
  let errorSample: string | null = null;

  try {
    const sitemap = await sitemapUrls(fetcher, adapter.sitemapUrl, 64);
    const productUrls = sitemap.map((entry) => new URL(entry, adapter.baseUrl))
      .filter((url) => url.hostname === new URL(adapter.baseUrl).hostname && !url.search && adapter.productPathPattern.test(url.pathname))
      .map((url) => url.toString());
    process.stdout.write(`Found ${sitemap.length} sitemap URLs; ${productUrls.length} clean laptop product URLs are eligible.\n`);
    const pageCache = new Map<string, RawListing>();

    for (const target of canonicalTargets) {
      const codes = modelCodes(`${target.title} ${Object.values(target.specs).join(" ")}`);
      const targetBrand = compact(target.title.trim().split(/\s+/)[0]);
      let found = false;
      let candidateCount = 0;
      const mismatchTitles: string[] = [];
      for (const code of codes) {
        const slugged = compact(code);
        const candidates = productUrls.filter((url) => {
          const path = compact(new URL(url).pathname);
          return path.includes(targetBrand) && path.includes(slugged);
        });
        candidateCount += candidates.length;
        for (const url of candidates.slice(0, 8)) {
          if (!pageCache.has(url)) {
            attempted += 1;
            try {
              const listing = await adapter.scrape(url);
              validateListing(listing, adapter.baseUrl);
              pageCache.set(url, listing);
            } catch (error) {
              failed += 1;
              errorSample ??= `${url}: ${error instanceof Error ? error.message : String(error)}`;
              continue;
            }
          }
          const candidate = pageCache.get(url)!;
          if (!exactConfiguration(target, candidate, code)) {
            if (!mismatchTitles.includes(candidate.title)) mismatchTitles.push(candidate.title);
            continue;
          }
          const { listingId } = await persistListing(starTech.id, candidate);
          await db.update(listings).set({ variantId: target.variantId, matchStatus: "matched_auto", matchConfidence: "1.000" })
            .where(eq(listings.id, listingId));
          process.stdout.write(`Matched: ${target.title} ↔ ${candidate.title} · ${candidate.price ?? "no price"}\n`);
          matched += 1;
          found = true;
          break;
        }
        if (found) break;
      }
      if (!found) process.stdout.write(`No exact Star Tech variant found yet (${candidateCount} URL candidates): ${target.title}${mismatchTitles.length ? `; checked ${mismatchTitles.slice(0, 2).join(" | ")}` : `; model codes ${codes.join(", ") || "none"}`}\n`);
      if (!found) {
        const previous = existingMatches.find((row) => row.variantId === target.variantId);
        if (previous) await db.update(listings).set({ variantId: null, matchStatus: "unmatched", matchConfidence: null }).where(eq(listings.id, previous.id));
      }
    }
  } catch (error) {
    failed += 1;
    errorSample ??= error instanceof Error ? error.message : String(error);
  } finally {
    await db.update(scrapeRuns).set({ finishedAt: new Date(), attempted, succeeded: matched, failed, errorSample }).where(eq(scrapeRuns.id, run.id));
  }
  process.stdout.write(`Star Tech matched ${matched}/${canonicalTargets.length} exact laptop configurations after ${attempted} product-page requests in this run.\n`);
  if (matched > 0) await revalidateSiteCatalog();
  if (failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
