import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductExperience } from "@/components/product-experience";
import { getProduct } from "@/lib/catalog";
import { getLiveProduct } from "@/lib/live-catalog";
import { siteConfig } from "@/lib/site-config";
import type { ProductSummary, StoreOffer } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getLiveProduct(slug) ?? getProduct(slug);
  return {
    title: product ? `${product.name} price in Bangladesh` : "Product not found",
    description: product?.description,
    ...(product ? { alternates: { canonical: `/p/${product.slug}` } } : {}),
  };
}

function productJsonLd(product: ProductSummary) {
  const offers = Object.values(product.offers).flat();
  const prices = offers.map((offer) => offer.price).filter((price): price is number => price !== null);
  const availabilityUrl: Record<StoreOffer["availability"], string> = {
    in_stock: "https://schema.org/InStock",
    out_of_stock: "https://schema.org/OutOfStock",
    preorder: "https://schema.org/PreOrder",
    upcoming: "https://schema.org/PreOrder",
    call_for_price: "https://schema.org/LimitedAvailability",
    unknown: "https://schema.org/LimitedAvailability",
  };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    url: `${siteConfig.url}/p/${product.slug}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      offerCount: offers.length,
      ...(prices.length ? { lowPrice: Math.min(...prices), highPrice: Math.max(...prices) } : {}),
      offers: offers.map((offer) => ({
        "@type": "Offer",
        url: offer.listingId ? `${siteConfig.url}/go/${offer.listingId}` : offer.url,
        priceCurrency: "BDT",
        ...(offer.price !== null ? { price: offer.price } : {}),
        availability: availabilityUrl[offer.availability],
        seller: { "@type": "Organization", name: offer.store },
      })),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const liveProduct = await getLiveProduct(slug);
  const product = liveProduct ?? getProduct(slug);
  if (!product) notFound();
  return <>
    {liveProduct && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(liveProduct)).replace(/</g, "\\u003c") }} />}
    <div className="product-page shell"><ProductExperience product={product} live={Boolean(liveProduct)} /></div>
  </>;
}
