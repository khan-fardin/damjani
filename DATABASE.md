# DATABASE.md

PostgreSQL. Names are `snake_case`. Prices are stored as **integers in BDT (taka)**, never floats.

## 1. Entity overview

```
categories ─┐
brands ─────┼──► products ──► variants ──► listings ◄── stores
            │                                 │
            │                                 └──► price_snapshots
            └──► (specs as JSONB)

scrape_runs        (ops log per store run)
match_reviews      (admin queue for uncertain matches)
click_events       (outbound click tracking)
```

- **product** = model family (Acer Aspire 3 A324-51)
- **variant** = exact configuration (i5-1235U / 8GB / 512GB / Silver), the unit we compare
- **listing** = one store's page for (what it thinks is) a variant
- **price_snapshot** = a point-in-time price/stock for a listing (only written on change)

## 2. Schema (SQL)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,          -- 'laptop'
  name        TEXT NOT NULL,
  parent_id   INT REFERENCES categories(id)
);

CREATE TABLE brands (
  id    SERIAL PRIMARY KEY,
  slug  TEXT UNIQUE NOT NULL,                -- 'acer'
  name  TEXT NOT NULL
);

CREATE TABLE stores (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,          -- 'startech'
  name        TEXT NOT NULL,
  base_url    TEXT NOT NULL,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE products (                      -- model family
  id           SERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,         -- 'acer-aspire-3-a324-51'
  name         TEXT NOT NULL,                -- 'Acer Aspire 3 A324-51'
  brand_id     INT NOT NULL REFERENCES brands(id),
  category_id  INT NOT NULL REFERENCES categories(id),
  image_url    TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE variants (                      -- exact configuration
  id           SERIAL PRIMARY KEY,
  product_id   INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  slug         TEXT UNIQUE NOT NULL,         -- 'acer-aspire-3-a324-51-i5-8gb-512gb'
  label        TEXT NOT NULL,                -- 'i5-1235U · 8GB · 512GB SSD'
  mpn          TEXT,                         -- manufacturer part number / model code
  specs        JSONB NOT NULL DEFAULT '{}',  -- {cpu, ram_gb, storage_gb, screen_in, color, ...}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX variants_product_idx ON variants(product_id);
CREATE INDEX variants_mpn_idx     ON variants(mpn);
CREATE INDEX variants_specs_gin   ON variants USING GIN (specs);

CREATE TYPE availability AS ENUM
  ('in_stock','out_of_stock','preorder','upcoming','call_for_price','unknown');

CREATE TYPE match_status AS ENUM
  ('matched_auto','matched_manual','pending_review','unmatched','rejected');

CREATE TABLE listings (                      -- a store's page
  id               BIGSERIAL PRIMARY KEY,
  store_id         INT NOT NULL REFERENCES stores(id),
  variant_id       INT REFERENCES variants(id),          -- NULL until matched
  url              TEXT NOT NULL,
  external_id      TEXT,                                 -- store's own SKU/id
  raw_title        TEXT NOT NULL,
  raw_mpn          TEXT,
  raw_specs        JSONB NOT NULL DEFAULT '{}',
  image_url        TEXT,
  condition        TEXT NOT NULL DEFAULT 'new',          -- new | used | refurbished

  -- denormalized "current" state for fast reads
  current_price    INT,                                  -- BDT, NULL if no price
  regular_price    INT,
  availability     availability NOT NULL DEFAULT 'unknown',
  last_scraped_at  TIMESTAMPTZ,
  last_changed_at  TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,

  match_status     match_status NOT NULL DEFAULT 'unmatched',
  match_confidence NUMERIC(4,3),

  UNIQUE (store_id, url)
);
CREATE INDEX listings_variant_idx ON listings(variant_id) WHERE is_active;
CREATE INDEX listings_status_idx  ON listings(match_status);
CREATE INDEX listings_title_trgm  ON listings USING GIN (raw_title gin_trgm_ops);

CREATE TABLE price_snapshots (               -- append-only history
  id            BIGSERIAL PRIMARY KEY,
  listing_id    BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price         INT,
  regular_price INT,
  availability  availability NOT NULL,
  scraped_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX snapshots_listing_time_idx ON price_snapshots(listing_id, scraped_at DESC);

CREATE TABLE match_reviews (                 -- admin queue
  id                 BIGSERIAL PRIMARY KEY,
  listing_id         BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  suggested_variant  INT REFERENCES variants(id),
  score              NUMERIC(4,3),
  reasons            JSONB,                  -- why the matcher suggested it
  status             TEXT NOT NULL DEFAULT 'open',   -- open | approved | rejected | new_variant
  resolved_by        TEXT,
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scrape_runs (
  id           BIGSERIAL PRIMARY KEY,
  store_id     INT NOT NULL REFERENCES stores(id),
  job_type     TEXT NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  attempted    INT NOT NULL DEFAULT 0,
  succeeded    INT NOT NULL DEFAULT 0,
  failed       INT NOT NULL DEFAULT 0,
  error_sample TEXT
);

CREATE TABLE click_events (
  id          BIGSERIAL PRIMARY KEY,
  listing_id  BIGINT NOT NULL REFERENCES listings(id),
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer    TEXT
);
```

## 3. Key queries

**Comparison table for one variant (cheapest first):**
```sql
SELECT s.name AS store, l.current_price, l.regular_price,
       l.availability, l.url, l.last_scraped_at
FROM listings l
JOIN stores s ON s.id = l.store_id
WHERE l.variant_id = $1
  AND l.is_active
  AND l.current_price IS NOT NULL
ORDER BY (l.availability = 'in_stock') DESC, l.current_price ASC;
```

**Product-level price range (for cards/SEO):**
```sql
SELECT v.product_id,
       MIN(l.current_price) AS lowest,
       MAX(l.current_price) AS highest,
       COUNT(DISTINCT l.store_id) AS store_count
FROM variants v
JOIN listings l ON l.variant_id = v.id AND l.is_active AND l.current_price IS NOT NULL
GROUP BY v.product_id;
```

**Price history for a chart (lowest price per day across stores):**
```sql
SELECT date_trunc('day', ps.scraped_at) AS day, MIN(ps.price) AS lowest
FROM price_snapshots ps
JOIN listings l ON l.id = ps.listing_id
WHERE l.variant_id = $1 AND ps.price IS NOT NULL
GROUP BY 1 ORDER BY 1;
```

**Fuzzy candidate search for matching:**
```sql
SELECT v.id, v.label, similarity(p.name || ' ' || v.label, $1) AS sim
FROM variants v JOIN products p ON p.id = v.product_id
WHERE p.brand_id = $2
ORDER BY sim DESC LIMIT 10;
```

## 4. Design notes

- **Write a snapshot only when `price` or `availability` changed.** It keeps history small and charts clean. Always update `last_scraped_at` on the listing itself.
- **Denormalized `current_price`** on `listings` avoids scanning snapshots on every page view.
- **Don't delete listings.** Flip `is_active = false` when a page disappears, so history and matches survive if the product returns.
- **Conditions:** filter `condition = 'new'` by default in comparisons.
- **Later:** materialized view for `product_price_summary`, refreshed after scrape batches. Partition `price_snapshots` by month if it grows past tens of millions of rows.
