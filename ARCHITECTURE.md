# ARCHITECTURE.md

## 1. High-level view

```
┌────────────────────┐        ┌──────────────────────────┐
│  Store websites    │        │   Scraper Worker         │
│  (StarTech, Ryans, │◄───────│   (separate              │
│   Techland, ...)   │  HTTP  │    service)              │
└────────────────────┘        │  • site adapters         │
                              │  • normalizer            │
                              │  • matcher               │
                              └────────────┬─────────────┘
                                           │ writes
                                           ▼
┌────────────────────┐        ┌──────────────────────────┐
│   Browser          │◄──────►│   Next.js App            │
│   (mobile-first)   │  HTML  │   • public pages (ISR)   │
└────────────────────┘        │   • API routes           │
                              │   • /admin (review queue)│
                              └────────────┬─────────────┘
                                           │ reads/writes
                                           ▼
                              ┌──────────────────────────┐
                              │   PostgreSQL             │
                              │   (+ pg_trgm, FTS)       │
                              └──────────────────────────┘
```

**Key principle:** the scraper and the website are **separate concerns** that only meet at the database. A broken scraper never takes the site down, and the site never slows scraping.

## 2. Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | SSR/ISR for SEO, server components keep JS small |
| Styling | **Tailwind CSS + shadcn/ui** | Fast to build a minimal, consistent design |
| Charts | **Recharts** (or `visx`) | Price history graph |
| Database | **PostgreSQL** (Neon) | Relational data, JSONB for specs, `pg_trgm` for fuzzy search |
| ORM | **Drizzle ORM** | Type-safe, lightweight |
| Scraper runtime | **Node.js + `undici`/`got` + `cheerio`**; **Playwright** only as fallback | HTTP + HTML parsing is 10-50× cheaper than a headless browser |
| Job scheduling | **BullMQ + Redis**, or simpler: **cron / GitHub Actions / Inngest** to start | Staggered, retryable jobs |
| Search | v1: Postgres FTS + `pg_trgm`. v2: **Meilisearch/Typesense** | Typo-tolerant search without extra infra early on |
| Hosting | Web: **Vercel**. Scraper + DB: **VPS / Railway / Fly.io** | Serverless functions are a poor fit for long scraping jobs |
| Monitoring | Sentry + simple `scrape_runs` table + Uptime check | Know when a site changes its HTML |

## 3. Monorepo layout (recommended)

```
damjani/                     # name TBD
├─ apps/
│  ├─ web/                    # Next.js app
│  │  ├─ app/
│  │  │  ├─ (public)/
│  │  │  │  ├─ page.tsx                 # Home
│  │  │  │  ├─ search/page.tsx          # Search results
│  │  │  │  ├─ c/[category]/page.tsx    # Category listing
│  │  │  │  ├─ p/[slug]/page.tsx        # Product + comparison
│  │  │  │  └─ compare/page.tsx         # Side-by-side specs (v2)
│  │  │  ├─ admin/                      # Review queue (protected)
│  │  │  └─ api/                        # search suggest, redirect tracker
│  │  ├─ components/
│  │  └─ lib/
│  └─ scraper/                # Node worker
│     ├─ src/
│     │  ├─ adapters/         # one file per store
│     │  │  ├─ startech.ts
│     │  │  ├─ ryans.ts
│     │  │  └─ ...
│     │  ├─ core/             # fetcher, rate limiter, retry, robots check
│     │  ├─ normalize/        # price + title + spec normalization
│     │  ├─ match/            # matching pipeline
│     │  └─ jobs/             # discover, refresh, match
├─ packages/
│  ├─ db/                     # Drizzle schema + migrations + queries
│  └─ shared/                 # types, constants, utils (price formatting)
└─ docs/                      # these .md files
```

Use **pnpm workspaces + Turborepo**. If a monorepo feels heavy at the start, begin with a single repo and two folders (`web/`, `scraper/`) sharing a `db/` package.

## 4. Data flow

1. **Discover**: crawl each store's category/listing pages (paginated) to collect product URLs.
2. **Fetch + Parse**: for each URL, fetch the product page, extract title, price, regular price, stock, image, specs, SKU/MPN.
3. **Normalize**: clean the price (`"৳ 54,500"` → `54500`), canonicalize the title, parse specs.
4. **Upsert listing**: save or update the `listing` row and append a `price_snapshot` **only if price/stock changed**, which keeps the table small.
5. **Match**: link the listing to a canonical `variant` (auto) or queue it for review.
6. **Serve**: the web app reads the `variant → listings` join and renders the comparison.

## 5. Rendering strategy (Next.js)

| Page | Strategy | Reason |
|---|---|---|
| Home | Static + ISR (revalidate ~1h) | Mostly popular/trending lists |
| Category | ISR (~15-30 min) | Many pages, SEO-critical |
| Product | ISR (~10-15 min) + on-demand revalidate when the scraper updates | Fresh prices, fast loads |
| Search | Server-rendered, cached | Dynamic queries |
| Admin | Dynamic, auth-protected | Internal |

Use **on-demand revalidation** (`revalidateTag('product-123')`) triggered by the scraper after a price change. That's fresher than time-based ISR and cheaper than SSR on every request.

## 6. SEO (a major traffic source for this kind of site)

- Clean URLs: `/p/acer-aspire-3-a324-51-i5-8gb-512gb`
- Per-product `<title>`: "Acer Aspire 3 A324 Price in Bangladesh (Nov 2026) | Compare Prices"
- JSON-LD `Product` + `AggregateOffer` (lowPrice, highPrice, offerCount)
- Sitemap generated from the DB, with `lastmod` from the last price change
- Target queries like *"[product] price in bangladesh"*, which is what people actually type

## 7. Outbound links and attribution

- All store links go through `/go/[listingId]` (a redirect route) so you can **count clicks per store**. That data is valuable for future affiliate deals.
- Use `rel="nofollow sponsored noopener"` on outbound links.

## 8. Caching & performance

- CDN in front (Cloudflare). Good BD latency, free tier is plenty to start.
- Images: don't hotlink store images forever. Proxy/resize via `next/image` or store thumbnails in object storage (R2/S3). Check the store's terms.
- Keep JS minimal. Server components for lists, and client components only for the chart, filters, and search box.

## 9. Security & ops

- Admin behind auth (NextAuth/Auth.js or Clerk), with only your account allowed.
- Scraper secrets in env vars, and the DB reachable only from the scraper and web server.
- Rate limit public search API routes.
- Nightly DB backups.

## 10. Scaling notes (so you don't over-build now)

- Hundreds of thousands of listings × a few snapshots per week is **small** for Postgres. No need for time-series DBs.
- Start with one scraper process, and add a queue and workers only when you have more than ~10 stores or hourly refresh needs.
- Move search to Meilisearch only when Postgres FTS quality becomes the bottleneck.
