import type { Metadata } from "next";
import { CatalogResults } from "@/components/catalog-results";
import { SearchBar } from "@/components/search-bar";
import { searchProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search laptops" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const matches = searchProducts(q);
  return <div className="browse-page shell"><div className="page-intro"><div><div className="breadcrumbs"><span>Home</span><span>/</span><span>Search</span></div><span className="eyebrow">THE LAPTOP INDEX</span><h1>{q ? <>Results for <span className="query-highlight">“{q}”</span></> : "Find your next laptop."}</h1><p>Compare sample prices and availability across five Bangladesh stores.</p></div><div className="page-search"><SearchBar defaultValue={q} /></div></div><CatalogResults items={matches} title={q ? `${matches.length} matching ${matches.length === 1 ? "model" : "models"}` : "All laptops"} description={q ? `Search results for “${q}”` : "A considered selection of laptops, all in one place."} /></div>;
}
