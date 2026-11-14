# DESIGN.md

**Direction:** minimal, light, modern, with a calm tool-like feel. The data (prices) is the hero. Lots of white space, thin borders, one accent color, and no decoration that doesn't help comparison.

**Design principles**
1. **The cheapest price is obvious within one second.**
2. **Trust through clarity.** Always show the store name, timestamp, and stock state.
3. **Mobile-first.** Design at 375px, then scale up.
4. **Bilingual-ready.** Every text container must survive Bangla (taller glyphs, longer strings).
5. **Fast.** Few images, no heavy animation, system-level performance.

---

## 1. Design tokens

### Color (light theme first, dark theme later)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAFAF9` | Page background (warm off-white) |
| `surface` | `#FFFFFF` | Cards, table |
| `border` | `#E7E5E4` | 1px hairlines |
| `text` | `#1C1917` | Primary text |
| `text-muted` | `#78716C` | Secondary text, timestamps |
| `primary` | `#0F766E` | Links, buttons, focus (deep teal) |
| `primary-soft` | `#CCFBF1` | Tinted backgrounds, chips |
| `best` | `#15803D` | "Lowest price" text |
| `best-soft` | `#DCFCE7` | "Lowest price" badge background |
| `warn` | `#B45309` | Out of stock / stale data |
| `danger` | `#B91C1C` | Errors |

Keep to **one accent (teal)**. Green is reserved *only* for "best price", so it keeps its meaning.

### Typography
- **Latin:** Inter (variable)
- **Bangla:** Hind Siliguri or Noto Sans Bengali, as a font-family fallback so mixed text renders well
- **Numbers:** `font-variant-numeric: tabular-nums` on all prices, so columns align

| Style | Size / Line | Weight |
|---|---|---|
| Display (hero) | 36 / 44 (mobile 28 / 36) | 700 |
| H1 (product title) | 28 / 36 | 650 |
| H2 | 20 / 28 | 600 |
| Body | 15 / 24 | 400 |
| Small / meta | 13 / 20 | 400 |
| Price (large) | 32 / 36 | 700 |

For Bangla, add roughly +2px line-height.

### Spacing, radius, elevation
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: `8px` (inputs, chips), `12px` (cards), `999px` (badges)
- Elevation: **almost none.** Prefer 1px borders. One soft shadow (`0 1px 2px rgba(0,0,0,.04)`) for hover only.
- Max content width: `1080px`, centered; table pages can go to `1200px`

### Price formatting
- Format: `৳ 54,500` (Western grouping is the common web convention in BD; use `Intl.NumberFormat('en-BD')` and verify the output)
- Optional Bangla numerals in the `bn` locale: `৳ ৫৪,৫০০`
- Always show `৳` before the number; never show decimals

---

## 2. Layout & navigation

**Header (sticky, 56px):** logo (left) · search input (center, expands on mobile into a full-width bar) · "Categories" menu (right). No login in v1.

**Footer:** About · How it works · Stores we track · Disclaimer · Contact.

**Breakpoints:** `sm 640` · `md 768` · `lg 1024`.

---

## 3. Pages & wireframes

### 3.1 Home

```
┌──────────────────────────────────────────────────────────┐
│ ◉ logo                [ 🔍 Search laptop, phone, GPU… ]  Categories │
├──────────────────────────────────────────────────────────┤
│                                                          │
│          Find the best tech price in Bangladesh          │
│      Compare prices across 10+ stores, updated hourly    │
│                                                          │
│        [ 🔍  Search "Acer Aspire 3", "RTX 4060"… ]       │
│        Popular:  Laptops · Phones · Monitors · GPUs      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Trending comparisons                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │
│  │  img   │ │  img   │ │  img   │ │  img   │             │
│  │ Name   │ │ Name   │ │ Name   │ │ Name   │             │
│  │ from   │ │ from   │ │ from   │ │ from   │             │
│  │৳54,500 │ │৳…      │ │৳…      │ │৳…      │             │
│  │ 6 stores│ │        │ │        │ │        │             │
│  └────────┘ └────────┘ └────────┘ └────────┘             │
│  Biggest price drops this week                           │
│  Stores we compare:  [StarTech] [Ryans] [Techland] [...] │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Search results / Category

```
Search: "aspire 3"                        128 results
┌─────────────┬────────────────────────────────────────────┐
│ FILTERS     │  Sort: [Lowest price ▾]                    │
│ Brand ☐ Acer│  ┌──────────────────────────────────────┐  │
│ Price range │  │ [img] Acer Aspire 3 A324-51          │  │
│  ৳ ──●──● ৳ │  │       i5 · 8GB · 512GB               │  │
│ RAM  ☐ 8 ☐16│  │       From ৳54,500  · 6 stores       │  │
│ Store ☐ …   │  └──────────────────────────────────────┘  │
│ In stock ☑  │  …                                         │
└─────────────┴────────────────────────────────────────────┘
(mobile: filters collapse into a bottom sheet "Filters (2)")
```

### 3.3 Product page (the core screen)

```
Home › Laptops › Acer › Aspire 3 A324-51

┌───────────┐  Acer Aspire 3 A324-51
│           │  Variant:  [i5·8GB·512GB] [i5·16GB·512GB] [i3·8GB·256GB]
│   image   │
│           │  Lowest price
└───────────┘  ৳ 54,500   at Star Tech · In stock
               ▼ 8% below average of ৳59,200

Compare prices (6 stores)                     Updated 2h ago
┌──────────────────────────────────────────────────────────┐
│ Store        Price       Stock        Updated    Action  │
├──────────────────────────────────────────────────────────┤
│ ● Star Tech  ৳54,500 ✔best  In stock    1h ago   [Visit ↗]│
│ ● Ryans      ৳55,000        In stock    3h ago   [Visit ↗]│
│ ● Techland   ৳55,900        Pre-order   2h ago   [Visit ↗]│
│ ● Skyland    ৳57,000        Out of stock 5h ago  [Visit ↗]│
└──────────────────────────────────────────────────────────┘

Price history        [30d] [90d] [1y]
┌──────────────────────────────────────────────────────────┐
│   line chart: lowest price over time, hover shows store  │
└──────────────────────────────────────────────────────────┘

Specifications   (clean two-column table, collapsible on mobile)
Similar products  (cards)
```

On **mobile**, the table becomes **stacked cards**, one per store, with store logo + price on one line and a full-width "Visit store" button.

### 3.4 Compare (v2)
Up to 3 products side by side, spec rows aligned, differences highlighted.

### 3.5 Admin (internal, functional over pretty)
- **Review queue:** listing title/URL on the left, suggested canonical variant on the right, buttons: **Approve · Reject · Create new variant**
- **Stores health:** last run, success rate, errors
- **Anomalies:** suspicious price jumps awaiting confirmation

---

## 4. Component inventory

| Component | Notes |
|---|---|
| `SearchBar` | Autocomplete dropdown (product + category), keyboard navigable |
| `ProductCard` | Image, name, "From ৳X", store count. Whole card is a link |
| `PriceTag` | Handles formatting, tabular nums, strikethrough regular price |
| `BestPriceBadge` | Green pill: "Lowest price" |
| `StockPill` | In stock (green-ish neutral) / Out of stock (muted amber) / Pre-order / Up-coming |
| `StoreRow` / `StoreCard` | Table row on desktop, card on mobile |
| `VariantPicker` | Segmented chips; unavailable combos disabled |
| `PriceHistoryChart` | Recharts line, range toggle, tooltip with store name |
| `FilterPanel` | Sidebar on desktop, bottom sheet on mobile |
| `FreshnessLabel` | "Updated 2h ago"; turns amber if > 24h |
| `EmptyState` / `Skeleton` | Skeleton loaders to avoid layout shift |

## 5. States to design (don't skip)

- **Out of stock everywhere:** show the price greyed with "Currently unavailable"
- **Only one store lists it:** say "Only on Ryans" rather than showing a lonely table
- **No price ("Call for price"):** show the text, don't show ৳0
- **Stale data (> 24h):** amber freshness label with a subtle note
- **No results:** suggest broader terms + popular categories
- **Loading:** skeletons, not spinners

## 6. Accessibility & UX rules

- Contrast ≥ 4.5:1 (check `text-muted` on `bg`)
- Never rely on color alone. "Lowest price" is a badge *with text*, stock has text *and* a dot
- Focus rings visible (`primary`, 2px)
- Tap targets ≥ 44px on mobile
- All outbound links labeled "Visit Star Tech" with an `↗` icon

## 7. Tone & copy

Short and plain. Examples: *"Lowest price"*, *"Updated 2h ago"*, *"Visit store"*, *"Prices are collected automatically and may differ on the store's website."* Prepare Bangla strings early (`next-intl`), but ship English first.

## 8. Design-first workflow (matches your plan)

1. **Static prototype in Next.js with mock data** (JSON file of ~20 products × 4-6 stores). No DB, no scraper.
2. Build in this order: tokens → `PriceTag`/`StockPill`/`BestPriceBadge` → `ProductCard` → Home → Search → **Product page** → Admin skeleton.
3. Review on a real phone, and iterate until the product page feels right.
4. Only then replace the mock data layer with real DB queries. If components take typed props (`ProductSummary`, `StoreOffer`), nothing in the UI has to change.

Optional: sketch key screens in Figma first (Home, Product, Mobile product). Three screens are enough.
