CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('in_stock', 'out_of_stock', 'preorder', 'upcoming', 'call_for_price', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('matched_auto', 'matched_manual', 'pending_review', 'unmatched', 'rejected');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referrer" text
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"variant_id" integer,
	"url" text NOT NULL,
	"external_id" text,
	"raw_title" text NOT NULL,
	"raw_mpn" text,
	"raw_specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image_url" text,
	"condition" text DEFAULT 'new' NOT NULL,
	"current_price" integer,
	"regular_price" integer,
	"availability" "availability" DEFAULT 'unknown' NOT NULL,
	"last_scraped_at" timestamp with time zone,
	"last_changed_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"match_status" "match_status" DEFAULT 'unmatched' NOT NULL,
	"match_confidence" numeric(4, 3)
);
--> statement-breakpoint
CREATE TABLE "match_reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"suggested_variant" integer,
	"score" numeric(4, 3),
	"reasons" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"price" integer,
	"regular_price" integer,
	"availability" "availability" NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"brand_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"image_url" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"job_type" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"attempted" integer DEFAULT 0 NOT NULL,
	"succeeded" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"error_sample" text
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"mpn" text,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_reviews" ADD CONSTRAINT "match_reviews_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_reviews" ADD CONSTRAINT "match_reviews_suggested_variant_variants_id_fk" FOREIGN KEY ("suggested_variant") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_store_url_unique" ON "listings" USING btree ("store_id","url");--> statement-breakpoint
CREATE INDEX "listings_variant_idx" ON "listings" USING btree ("variant_id") WHERE "listings"."is_active" = true;--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("match_status");--> statement-breakpoint
CREATE INDEX "snapshots_listing_time_idx" ON "price_snapshots" USING btree ("listing_id","scraped_at");--> statement-breakpoint
CREATE INDEX "variants_product_idx" ON "variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variants_mpn_idx" ON "variants" USING btree ("mpn");--> statement-breakpoint
CREATE INDEX "variants_specs_gin" ON "variants" USING gin ("specs");
