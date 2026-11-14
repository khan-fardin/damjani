# Tech Price Comparison for Bangladesh: Project Overview

> Working title: **damjani**

## 1. What we're building

A website where a user searches for a tech product (e.g. *Acer Aspire 3 A324*) and sees:

- the same product's **price on every Bangladeshi tech store** (Star Tech, Ryans, Techland, Skyland, Shams Technology, etc.)
- **stock status** per store (In stock / Out of stock / Pre-order / Up-coming)
- a **direct link** to that store's product page
- the **lowest price highlighted**, plus **price history** over time

Out of scope for v1: user accounts, checkout, reviews, native apps.

## 2. Doc index

| File | What it covers |
|---|---|
| `README.md` | Vision, naming, key decisions (this file) |
| `ARCHITECTURE.md` | System design, stack, folder structure, deployment |
| `SCRAPING.md` | Scraper design, per-site adapters, **product matching**, legal/ethics |
| `DATABASE.md` | Schema, indexes, query examples |
| `DESIGN.md` | Design system, pages, wireframes, components |
| `ROADMAP.md` | Phased plan, design-first, then data, then polish |

## 3. Your approach (match by canonical product name): feedback

Your idea is right: **we define our own canonical product, then map each store's listing to it.** Stores name the same product differently, so we need our own source of truth. Four refinements make it reliable:

### 4a. Match on identifiers first, names last
Product names are the *least* reliable signal. Better signals, in order:

1. **MPN / model code** (e.g. Acer `NX.KDHSI.00X`, Asus `X515EA-BQ1235W`). If two stores show the same code, it's the same product.
2. **Brand + model family + key specs** (Acer + Aspire 3 + A324-51 + i5-1235U + 8GB + 512GB).
3. **Fuzzy title similarity** as a fallback, which always goes through a confidence threshold.

### 4b. Separate "product" from "variant"
"Acer Aspire 3 A324" is a *family*. Stores sell different **configurations** (RAM, SSD, CPU, color) at very different prices. Comparing a 4GB model to a 16GB one would be misleading.

- **Product** = model family (Acer Aspire 3 A324-51)
- **Variant** = the exact sellable configuration (i5 / 8GB / 512GB / Silver)
- Prices are compared at the **variant** level. The product page lets the user pick a variant.

### 4c. Human-in-the-loop for uncertain matches
Auto-match when confidence is high (≥ 0.92, or MPN exact). Everything else goes to an **admin review queue**: "Is *this Ryans listing* the same as *this canonical variant*?" One click to approve, and the mapping is remembered forever. This is how you reach high accuracy without perfect algorithms.

### 4d. Start narrow
Matching 10 stores × every category on day one is how projects stall. Start with **laptops only** (the most price-sensitive category in BD), 4-5 stores, then expand to phones, monitors, GPUs, and so on.

## 5. Other things to decide early

- **Price fields:** stores show *regular price*, *discount price*, sometimes *cash price vs. card/EMI price*. Store all, compare on the **lowest standard cash price**.
- **Currency/locale:** BDT (৳), with Bangla numerals optional. UI in English first, Bangla later (design for it now).
- **Freshness:** show "Updated 2h ago" per price. Stale data destroys trust.
- **Mobile-first:** most Bangladeshi traffic is mobile, often on slower networks. Keep pages light.

## Prototype (Phase 0–1)

The current app is a design prototype for laptop price comparison. It uses mock data only; there is no database, scraper, account system, or live store feed.

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The main routes are `/`, `/search`, `/c/laptops`, and `/p/acer-aspire-3-a324-51`. Search, brand and stock filters, price sorting, configuration selection, and chart range controls are interactive.

### Project structure

- `app/` — Next.js App Router pages and shared styles
- `components/` — reusable catalog, search, and product comparison UI
- `data/mock-data.json` — 20 sample laptop models and price rows for five local stores
- `lib/` — typed catalog mapping, formatting, and site configuration

The sample catalog intentionally includes out-of-stock, pre-order, up-coming, call-for-price, and single-store cases. Prices, timestamps, store listings, and history are illustrative and must not be treated as current offers. The working name is **damjani**; domain and social handle availability have not been checked.

The GitHub Actions workflow is in `.github/workflows/ci.yml`. This workspace is not initialized as a Git repository yet, so CI will activate after repository setup.
