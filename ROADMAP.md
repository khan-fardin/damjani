# ROADMAP.md

Design first, then real data, then scale. Each phase ends with something you can look at or demo.

## Phase 0: Foundations
- [x] Use **damjani** as the prototype working name (domain + handles still need checking)
- [x] Scaffold a single-repo web prototype; defer the scraper and shared packages until real data work
- [ ] Initialize a Git repository and connect it to GitHub (the workspace approval for `git init` was rejected)
- [x] Next.js 15 + TypeScript + Tailwind CSS
- [x] `site-config.ts` (name, tagline, stores), Latin + Bangla font fallbacks, design tokens from `DESIGN.md`
- [x] ESLint, Prettier, and a GitHub Actions CI workflow file (activates after GitHub setup)

**Done when:** an empty themed shell with header/footer deploys to Vercel.

## Phase 1: Design prototype with mock data
- [x] Typed models: `ProductSummary`, `Variant`, `StoreOffer`, `PricePoint`
- [x] `mock-data.json`: 20 laptops × up to 5 stores, including out-of-stock, pre-order, call-for-price, upcoming, and single-store cases
- [x] Comparison UI: product cards, search, filters, variant picker, store offers, price history, and freshness labels
- [x] Pages: Home → Search → Product → Category
- [ ] Check on a real phone and a slow-network profile (Chrome DevTools "Fast 3G")

**Done when:** you can click through the whole experience and it *feels* right.

## Phase 2: Scraper proof of concept
- [x] Postgres + Drizzle schema from `DATABASE.md`; initial migration applied to Neon
- [x] Scraper core: fetcher with rate limit/retry/robots check, normalizers (price, Bangla digits, title)
- [x] **2 store adapters** (Star Tech sitemap; Techland BD curated laptop collections + structured product metadata)
- [ ] Adapter tests against saved HTML fixtures
- [x] CLI: `npm run scrape -- startech --category laptop --limit 10`
- [x] `scrape_runs` logging + validation rules

Live collection needs a real monitored `SCRAPER_CONTACT` in `.env.local`, saved-page fixtures, and a final source permission review. The Techland adapter prioritizes the retailer's recommended and best-seller laptop collections, then its laptop catalog; it records this order for the live listing view. Ryans is excluded because its terms prohibit automated extraction without written permission.

**Done when:** laptops from 2 stores land in the DB with sane prices and URLs.

## Phase 3: Matching + catalog
- [x] Attribute extractors for laptops (brand, model code, CPU, RAM, storage, screen)
- [x] Canonical `products` / `variants` seeding (from one reference store, then reviewed)
- [x] Matcher pipeline (exact candidates remain linked; plausible uncertain candidates are scored for review)
- [x] Admin review queue: approve / reject suggestions
- [x] Matching memory (approved mappings are retained on the listing when it is refreshed)

**Done when:** ≥ 85% of listings in the two stores are matched correctly (spot-check 100 by hand). Review tooling is implemented; this accuracy target still needs a manual audit.

## Phase 4: Connect UI to real data
- [x] Replace the mock data layer with DB queries (components unchanged)
- [x] Build Damjani product cards from canonical laptop records, surface the lowest current offer, and show matched retailer offers low-to-high on product pages
- [x] Cache live catalog queries for 15 minutes and invalidate after scraper/seed batches or approved matches
- [x] Postgres FTS + `pg_trgm` search with typo tolerance
- [x] `/go/[listingId]` redirect with click logging
- [x] SEO: canonical metadata, product JSON-LD, sitemap and robots rules

## Phase 5: More stores + automation (ongoing)
- [ ] Add stores one at a time (target 5, then 10)
- [ ] Scheduler: discover (daily), refresh-hot (1-3h), refresh-all (daily)
- [ ] Health alerts (Telegram/Discord/email) when an adapter's success rate drops
- [ ] Anomaly detection for suspicious price jumps
- [ ] Price history charts populated from real snapshots

## Phase 6: Beta launch
- [ ] Disclaimer, About, "Stores we track", Contact / takedown page
- [ ] Analytics (Plausible / Umami: privacy-friendly and light)
- [ ] Error monitoring (Sentry)
- [ ] Share with a small group (friends, BD tech communities/Facebook groups) and collect feedback

## Phase 7: Growth (later)
- Additional categories: phones → monitors → GPUs/components → accessories
- Price drop alerts (email / Telegram / WhatsApp), with the first need for accounts
- Bangla UI (`next-intl`)
- Side-by-side spec compare (up to 3 products)
- Browser extension or "paste a store URL → see cheaper elsewhere"
- Affiliate/partnership programs with stores
- Dark theme
- Meilisearch/Typesense if search needs it
- Public API (only if there's demand)

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Store changes HTML → adapter breaks | **High** | Fixtures + tests, health alerts, prefer JSON/JSON-LD sources |
| Wrong product matches erode trust | **High** | MPN-first matching, variant-level comparison, review queue, conservative thresholds |
| Store blocks/complains about scraping | Medium | Polite rate limits, robots.txt compliance, clear attribution, contact channel, pursue partnerships |
| Stale prices | Medium | Priority refresh for hot products, visible timestamps |
| Scope creep (all categories on day one) | **High** | Laptops only until matching is solid |
| Hosting cost creep | Low | Single small VPS + free-tier DB is enough early on |

## Suggested first week

| Day | Focus |
|---|---|
| 1 | Name, repo, Next.js shell, tokens, fonts |
| 2 | Mock data + core small components |
| 3 | Product page (desktop) |
| 4 | Product page (mobile) + chart |
| 5 | Home + search results |
| 6 | Polish, empty/edge states, test on phone |
| 7 | Inspect 5 candidate store sites: robots.txt, JSON endpoints, JSON-LD, sitemap. Pick the first 2 |

## Open questions (decide before Phase 2)
1. Final name and domain?
2. Laptops only for v1, or laptops + phones?
3. Self-host (VPS) or managed services (Vercel + Neon + Railway)?
4. Do you want to approach stores for permission/partnership up front, or launch the beta first?
5. Will you handle admin review yourself? (This affects how much to automate.)
