import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductExperience } from "@/components/product-experience";
import { getProduct } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = getProduct((await params).slug);
  return { title: product ? `${product.name} price in Bangladesh` : "Product not found", description: product?.description };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  return <div className="product-page shell"><ProductExperience product={product} /></div>;
}
