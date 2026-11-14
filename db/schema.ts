import {
  boolean,
  type AnyPgColumn,
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  bigserial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const availabilityEnum = pgEnum("availability", [
  "in_stock",
  "out_of_stock",
  "preorder",
  "upcoming",
  "call_for_price",
  "unknown",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "matched_auto",
  "matched_manual",
  "pending_review",
  "unmatched",
  "rejected",
]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  parentId: integer("parent_id").references((): AnyPgColumn => categories.id),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brandId: integer("brand_id").notNull().references(() => brands.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  imageUrl: text("image_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  mpn: text("mpn"),
  specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("variants_product_idx").on(table.productId),
  index("variants_mpn_idx").on(table.mpn),
  index("variants_specs_gin").using("gin", table.specs),
]);

export const listings = pgTable("listings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  variantId: integer("variant_id").references(() => variants.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  externalId: text("external_id"),
  rawTitle: text("raw_title").notNull(),
  rawMpn: text("raw_mpn"),
  rawSpecs: jsonb("raw_specs").$type<Record<string, string>>().notNull().default({}),
  imageUrl: text("image_url"),
  condition: text("condition").notNull().default("new"),
  currentPrice: integer("current_price"),
  regularPrice: integer("regular_price"),
  availability: availabilityEnum("availability").notNull().default("unknown"),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  matchStatus: matchStatusEnum("match_status").notNull().default("unmatched"),
  matchConfidence: numeric("match_confidence", { precision: 4, scale: 3 }),
}, (table) => [
  uniqueIndex("listings_store_url_unique").on(table.storeId, table.url),
  index("listings_variant_idx").on(table.variantId).where(sql`${table.isActive} = true`),
  index("listings_status_idx").on(table.matchStatus),
  index("listings_title_trgm").using("gin", sql`${table.rawTitle} gin_trgm_ops`),
]);

export const priceSnapshots = pgTable("price_snapshots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  listingId: bigint("listing_id", { mode: "number" }).notNull().references(() => listings.id, { onDelete: "cascade" }),
  price: integer("price"),
  regularPrice: integer("regular_price"),
  availability: availabilityEnum("availability").notNull(),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("snapshots_listing_time_idx").on(table.listingId, table.scrapedAt)]);

export const matchReviews = pgTable("match_reviews", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  listingId: bigint("listing_id", { mode: "number" }).notNull().references(() => listings.id, { onDelete: "cascade" }),
  suggestedVariant: integer("suggested_variant").references(() => variants.id),
  score: numeric("score", { precision: 4, scale: 3 }),
  reasons: jsonb("reasons").$type<Record<string, unknown>>(),
  status: text("status").notNull().default("open"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scrapeRuns = pgTable("scrape_runs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  jobType: text("job_type").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  attempted: integer("attempted").notNull().default(0),
  succeeded: integer("succeeded").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  errorSample: text("error_sample"),
});

export const clickEvents = pgTable("click_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  listingId: bigint("listing_id", { mode: "number" }).notNull().references(() => listings.id),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
  referrer: text("referrer"),
});
