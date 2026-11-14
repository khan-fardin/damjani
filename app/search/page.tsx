import type { Metadata } from "next";
import { CatalogResults } from "@/components/catalog-results";
import { SearchBar } from "@/components/search-bar";
import { getLiveCatalog } from "@/lib/live-catalog";
import { searchProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search laptops" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [liveProducts, sampleMatches] = await Promise.all([getLiveCatalog(), Promise.resolve(searchProducts(q))]);
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const liveMatches = liveProducts.filter((product) => {
    const searchable = `${product.name} ${product.brand} ${product.series} ${product.variants.map((variant) => Object.values(variant.specs).join(" ")).join(" ")}`.toLowerCase();
    return words.every((word) => searchable.includes(word));
  });

  return <div className="browse-page shell">
    <div className="page-intro">
      <div><div className="breadcrumbs"><span>Home</span><span>/</span><span>Search</span></div><span className="eyebrow">THE LAPTOP INDEX</span><h1>{q ? <>Results for <span className="query-highlight">“{q}”</span></> : "Find your next laptop."}</h1><p>{liveProducts.length ? "Search laptops, then open a card to compare matched store offers from lowest to highest." : "Search sample prices and availability across the prototype catalog."}</p></div>
      <div className="page-search"><SearchBar defaultValue={q} /></div>
    </div>
    {liveProducts.length ? <CatalogResults items={liveMatches} title={q ? `${liveMatches.length} matching ${liveMatches.length === 1 ? "model" : "models"}` : "All live laptops"} description={q ? `Live results for “${q}”.` : "Each card shows the lowest current offer."} /> : <CatalogResults items={sampleMatches} title={q ? `${sampleMatches.length} matching ${sampleMatches.length === 1 ? "model" : "models"}` : "All laptops"} description={q ? `Sample results for “${q}”` : "A considered selection from the sample catalog."} />}
  </div>;
}
