"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/catalog";
import type { ProductSummary } from "@/lib/types";

export function CatalogResults({ items, title, description }: { items: ProductSummary[]; title: string; description?: string }) {
  const [brand, setBrand] = useState("All brands");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("recommended");
  const brands = ["All brands", ...Array.from(new Set(products.map((product) => product.brand))).sort()];
  const visible = useMemo(() => {
    let result = items.filter((product) => brand === "All brands" || product.brand === brand);
    if (inStock) result = result.filter((product) => Object.values(product.offers).flat().some((offer) => offer.availability === "in_stock"));
    return [...result].sort((a, b) => {
      const low = (product: ProductSummary) => Math.min(...Object.values(product.offers).flat().map((offer) => offer.price ?? Infinity));
      return sort === "price-high" ? low(b) - low(a) : sort === "price-low" ? low(a) - low(b) : 0;
    });
  }, [items, brand, inStock, sort]);
  return <div className="catalog-layout">
    <aside className="filter-panel"><div className="filter-heading"><div><span className="eyebrow">Refine</span><h3>Filters</h3></div><button className="text-button" onClick={() => { setBrand("All brands"); setInStock(false); }}>Clear</button></div>
      <label className="filter-label" htmlFor="brand-select">Brand</label><select id="brand-select" className="select-control" value={brand} onChange={(event) => setBrand(event.target.value)}>{brands.map((name) => <option key={name}>{name}</option>)}</select>
      <div className="filter-divider" /><label className="check-row"><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /><span>In stock only</span><small>{items.filter((product) => Object.values(product.offers).flat().some((offer) => offer.availability === "in_stock")).length}</small></label>
      <div className="filter-divider" /><div className="filter-label">Popular specs</div><div className="spec-filter-chips"><span>Core i5</span><span>8 GB</span><span>512 GB SSD</span></div>
      <div className="filter-note"><span className="note-mark">↗</span><span>We compare the standard cash price shown by each store.</span></div>
    </aside>
    <section className="results-main"><div className="results-heading"><div><span className="eyebrow">LAPTOPS / BANGLADESH</span><h2>{title}</h2>{description && <p>{description}</p>}</div><label className="sort-control"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="price-low">Lowest price</option><option value="price-high">Highest price</option></select></label></div>
      <div className="results-count"><span>{visible.length} models</span><span>Prices checked within the last 5 hours</span></div>
      {visible.length ? <div className="product-grid">{visible.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div> : <div className="empty-state"><span className="empty-icon">⌕</span><h3>No laptops found</h3><p>Try a broader brand or clear your filters.</p><button onClick={() => { setBrand("All brands"); setInStock(false); }} className="button button-secondary">Clear filters</button></div>}
    </section>
  </div>;
}
