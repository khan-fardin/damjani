CREATE INDEX "listings_title_fts" ON "listings" USING gin (to_tsvector('simple', "raw_title"));--> statement-breakpoint
CREATE INDEX "products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_name_fts" ON "products" USING gin (to_tsvector('simple', "name"));