import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductExperience } from "@/components/product-experience";
import { getProduct } from "@/lib/catalog";
import { getLiveProduct } from "@/lib/live-catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getLiveProduct(slug) ?? getProduct(slug);
  return { title: product ? `${product.name} price in Bangladesh` : "Product not found", description: product?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const liveProduct = await getLiveProduct(slug);
  const product = liveProduct ?? getProduct(slug);
  if (!product) notFound();
  return <div className="product-page shell"><ProductExperience product={product} live={Boolean(liveProduct)} /></div>;
}
