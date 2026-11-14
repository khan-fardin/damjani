import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogResults } from "@/components/catalog-results";
import { products } from "@/lib/catalog";

export const metadata: Metadata = { title: "Laptop prices in Bangladesh" };
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (category !== "laptops" && category !== "laptop") notFound();
  return <div className="browse-page shell"><div className="page-intro category-intro"><div><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Laptops</span></div><span className="eyebrow">20 MODELS · 5 LOCAL STORES</span><h1>Find your next<br /><span className="query-highlight">laptop.</span></h1><p>Thoughtful picks across work, study, and play. Compare sample prices before you decide.</p></div><div className="category-aside"><span>THE RIGHT ONE IS</span><strong>closer than<br />you think<span>.</span></strong><i>↑</i></div></div><CatalogResults items={products} title="Laptops to compare" description="Browse all models in the sample catalog." /></div>;
}
