import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogResults } from "@/components/catalog-results";
import { getLiveCatalog } from "@/lib/live-catalog";
import { products } from "@/lib/catalog";

export const metadata: Metadata = { title: "Laptop prices in Bangladesh" };
export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (category !== "laptops" && category !== "laptop") notFound();
  const liveProducts = await getLiveCatalog();
  return <div className="browse-page shell">
    <div className="page-intro category-intro">
      <div>
        <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Laptops</span></div>
        <span className="eyebrow">{liveProducts.length ? `${liveProducts.length} MODELS · ${new Set(liveProducts.flatMap((product) => Object.values(product.offers).flat().map((offer) => offer.store))).size} STORES` : "20 MODELS · SAMPLE CATALOG"}</span>
        <h1>Find your next<br /><span className="query-highlight">laptop.</span></h1>
        <p>{liveProducts.length ? "Compare the lowest current listing on each card. Open a laptop to see all matched store offers from lowest to highest." : "Sample listings appear until live laptop data is collected."}</p>
      </div>
      <div className="category-aside"><span>THE RIGHT ONE IS</span><strong>closer than<br />you think<span>.</span></strong><i>↑</i></div>
    </div>
    {liveProducts.length ? <CatalogResults items={liveProducts} title="Laptops to compare" description="Current matched offers, ordered from the lowest price on each product card." /> : <CatalogResults items={products} title="Laptops to compare" description="Browse models in the sample catalog." />}
  </div>;
}
