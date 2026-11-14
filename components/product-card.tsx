import Link from "next/link";
import { getLowestPrice } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";
import { ProductArt } from "@/components/product-art";

export function ProductCard({ product, index = 0 }: { product: ProductSummary; index?: number }) {
  const price = getLowestPrice(product);
  const storeCount = product.offers[product.variants[0].id]?.length ?? 0;
  return <Link className="product-card" href={`/p/${product.slug}`}>
    <div className="card-art-wrap"><ProductArt tone={product.image} compact /><span className="card-index">{String(index + 1).padStart(2, "0")}</span><span className="card-arrow">↗</span></div>
    <div className="card-content"><div className="eyebrow">{product.brand} <span>·</span> {product.series}</div><h3>{product.name}</h3><div className="card-specs">{product.variants[0].specs.Processor} <i /> {product.variants[0].specs.Memory} <i /> {product.variants[0].specs.Storage}</div>
      <div className="card-bottom"><div><span className="from-label">From</span><strong className="card-price">{price === null ? "Call for price" : formatPrice(price)}</strong></div><span className="store-count">{storeCount} stores <b>→</b></span></div>
    </div>
  </Link>;
}
