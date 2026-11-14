# SCRAPING.md: Data Extraction & Product Matching

## 1. Principles

1. **HTTP first, browser last.** Plain HTTP + HTML parsing is fast, cheap, and stable. Use Playwright only for sites that render prices with client-side JS.
2. **Prefer structured data over HTML selectors.** Look in this order for each site:
   1. A public/undocumented **JSON endpoint** the site's own frontend calls (check DevTools → Network → Fetch/XHR)
   2. **JSON-LD** (`<script type="application/ld+json">`) with `Product` / `Offer`
   3. **Open Graph / meta tags** (`product:price:amount`)
   4. **Sitemap XML** for URL discovery (`/sitemap.xml`, often has product URLs)
   5. **CSS selectors** on the HTML (most fragile, so use as the last resort)
3. **One adapter per store**, all implementing the same interface, so adding a store is a single new file.
4. **Be a polite crawler.** Respect `robots.txt`, throttle, identify yourself, and cache.
5. **Never lose history.** Store a snapshot when price or stock changes.

> Many Bangladeshi tech stores run on common platforms (custom PHP/Laravel, OpenCart, WooCommerce, Shopify-like setups). Platform-specific adapters (e.g. "OpenCart base adapter") can be reused across multiple stores. **Inspect each site yourself and don't assume.** Platforms and page structures change.

## 2. Adapter interface

```ts
// apps/scraper/src/adapters/types.ts
export interface StoreAdapter {
  id: string;                       // 'startech'
  name: string;                     // 'Star Tech'
  baseUrl: string;
  rateLimit: { rps: number; concurrency: number };

  /** Yield product URLs (via sitemap or category pagination). */
  discover(category: CategorySlug): AsyncIterable<DiscoveredItem>;

  /** Fetch + parse one product page. */
  scrape(url: string): Promise<RawListing>;
}

export interface RawListing {
  url: string;
  externalId?: string;              // store SKU / product id
  title: string;
  brand?: string;
  mpn?: string;                     // manufacturer part number, if shown
  price: number | null;             // current selling price (BDT)
  regularPrice?: number | null;     // struck-through price
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'upcoming' | 'call_for_price' | 'unknown';
  imageUrl?: string;
  specs: Record<string, string>;    // raw key/value as shown
  scrapedAt: string;
}
```

### Edge cases specific to BD tech stores
- **"Call for price" / "Up Coming" / "Pre Order"**: no numeric price; store the status, price = null.
- **Multiple prices**: cash vs. card vs. EMI, so always capture the *cash / standard* price as the comparable one.
- **Bangla digits or commas**: `"৳ ৫৪,৫০০"` and `"54,500 Tk"` must both parse (normalizer handles Bangla numerals).
- **Bundles / freebies** ("with bag and mouse"): note them, but don't treat as a different product.
- **Official vs. unofficial/grey-market**: warranty differs. Add an optional `warranty` / `condition` field (new / used / refurbished); **never mix used with new** in a comparison.

## 3. Job types & scheduling

| Job | Frequency | What it does |
|---|---|---|
| `discover` | Daily (low traffic hours, e.g. 3-5am BST) | Find new / removed product URLs per store |
| `refresh-hot` | Every 1-3 hours | Re-scrape listings of popular/frequently viewed products |
| `refresh-all` | Every 12-24 hours | Re-scrape everything else |
| `match` | After each scrape batch | Run the matcher on new/changed listings |
| `health-check` | Hourly | Verify each adapter still returns valid data |

**Priority refresh:** products users actually view or search get refreshed more often. It saves requests and keeps the data users care about fresh.

**Staggering:** spread requests over time per store (e.g. 1 request/sec/store, with random jitter). A request burst looks like an attack and gets you blocked.

## 4. Reliability: handling site changes

Sites change their HTML without warning. Plan for it from day one:

- **Validation after every parse:** title non-empty, price is a sane number (e.g. 500 < price < 5,000,000), URL matches the store domain. Reject and log invalid results instead of saving them.
- **Anomaly detection:** if a listing's price drops or jumps by more than ~60% versus the last snapshot, **flag it for review** instead of publishing (it's often a parsing bug or a typo on the store).
- **`scrape_runs` table:** per run, record store, items attempted, succeeded, failed, duration. If the success rate drops below ~80%, alert (Telegram/Discord/email).
- **Fixtures:** save sample HTML pages per store in `__fixtures__/` and write adapter unit tests against them. When a site changes, update the fixture and fix the adapter.
- **Stale handling:** if a listing hasn't been seen for N days, mark it `inactive` rather than deleting it.

## 5. Product matching (the heart of the project)

### 5.1 Goal
Map every store `listing` to one canonical `variant`, so prices can be compared like-for-like.

### 5.2 Pipeline

```
raw listing
   │
   ▼
[1] Normalize title      lowercase, strip noise words ("price in bd", "laptop", "official"),
   │                      unify units (8 GB → 8gb), remove punctuation, expand abbreviations
   ▼
[2] Extract attributes   brand, series, model code, cpu, ram, storage, screen size, color
   │                      (regex + dictionaries; per-category extractors)
   ▼
[3] Exact identifier?    MPN / model code equals a known variant's code?  → MATCH (conf 1.0)
   │ no
   ▼
[4] Candidate search     Find canonical variants with the same brand + model family
   │                      (pg_trgm similarity + attribute filter)
   ▼
[5] Score candidates     weighted score:
   │                        model code overlap   0.40
   │                        key spec equality    0.35  (cpu, ram, storage)
   │                        title similarity     0.25
   ▼
[6] Decide
       score ≥ 0.92  → auto-match
       0.70 – 0.92   → review queue (admin one-click approve / reject / "new variant")
       < 0.70        → "unmatched" bucket; may become a new canonical product
```

### 5.3 Why the model code is gold
For laptops, a string like `A324-51-51XZ` or `15-fd0123TU` pinpoints the exact product. Build an **extractor per brand** (Acer, Asus, HP, Dell, Lenovo, MSI...) with regexes for their model-code formats. This one step resolves a large share of listings without any fuzzy logic.

### 5.4 Matching memory
Every approved match is saved as `(store_id, external_id/url) → variant_id`. Next scrape, the listing is matched **instantly** with no re-scoring. Manual decisions are never repeated.

### 5.5 Creating the canonical catalog
Two options, and I'd combine them:

- **Seed manually / from one "reference" store.** Pick the store with the cleanest specs (often the one that lists full specs) as the source of canonical products for v1.
- **Auto-create from clusters.** When 2+ stores have unmatched listings with the same model code, propose a new canonical product in the admin queue.

### 5.6 What NOT to do
- Don't match on **title similarity alone**. "Aspire 3 A324" vs "Aspire 3 A315" will score high and be wrong.
- Don't match across **different RAM/SSD** just because the model family is the same.
- Don't use an LLM for every listing (slow, costly). An LLM is fine as a **tie-breaker** for the 0.70-0.92 band, to pre-fill suggestions in the review queue. A human still confirms at first.

## 6. Legal & ethical checklist

> This is practical guidance, not legal advice. Check the current Terms of Service of each store and consider consulting a lawyer familiar with Bangladeshi law before launching commercially.

- [ ] Read each site's `robots.txt` and `Terms`. Skip anything disallowed.
- [ ] Use a clear `User-Agent` with a contact URL/email.
- [ ] Throttle: ≈ 1 req/sec/site or slower, with off-peak scheduling.
- [ ] Only collect **public product facts** (name, price, availability, URL). Don't scrape user data or reviews you don't have rights to.
- [ ] Always **link back** to the store; show "Price as of …" with the timestamp.
- [ ] Add a disclaimer: "Prices are collected automatically and may differ on the store's website."
- [ ] Provide a **takedown / contact** channel for stores.
- [ ] Long-term: approach stores for **feeds/APIs or affiliate programs**. It removes the scraping risk and creates revenue.

## 7. Dealing with blocking

If a site rate-limits or blocks you:
1. Slow down first. This fixes most cases.
2. Check for a sitemap/JSON endpoint, which is lighter than HTML pages.
3. Use proper headers and consistent sessions (ordinary browser-like headers).
4. Only then consider a headless browser for that specific adapter.
5. If a store clearly doesn't want to be scraped, **respect that and contact them** rather than escalating evasion.

## 8. Suggested v1 store order

Start with 4-5 stores whose pages are easiest to parse, and add the rest after the pipeline is solid. Rank candidates by (a) market share, (b) quality of structured data, (c) how clean their specs are. Examples to evaluate: **Star Tech, Ryans, Techland BD, Skyland, Shams Technology** (and later others such as UCC, Binary Logic, Computer Source, etc. Verify each before committing).
