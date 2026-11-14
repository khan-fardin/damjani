import raw from "@/data/mock-data.json";
import type { Availability, ProductSummary, StoreOffer, Variant } from "@/lib/types";

type RawProduct = Omit<(typeof raw.products)[number], "prices"> & { prices: (number | null | "call_for_price")[] };
const storeUrls: Record<string, string> = {
  "Star Tech": "https://www.startech.com.bd/",
  Ryans: "https://www.ryans.com/",
  "Techland BD": "https://www.techlandbd.com/",
  Skyland: "https://www.skyland.com.bd/",
  "Shams Technology": "https://www.shamstech.com/",
};
const recent = ["1h ago", "3h ago", "2h ago", "5h ago", "4h ago"];

function statusFor(index: number, storeIndex: number, slug: string): Availability {
  if (slug === "hp-omen-16-wf0096tx") return "out_of_stock";
  if (slug === "hp-250-g10" && storeIndex === 2) return "call_for_price";
  if (slug === "lenovo-v15-g4-iru" && storeIndex === 4) return "upcoming";
  if (storeIndex === 3 && ["acer-aspire-3-a324-51", "asus-tuf-gaming-f15-fx507zc4"].includes(slug)) return "out_of_stock";
  if (storeIndex === 2 && index % 5 === 0) return "preorder";
  if (storeIndex === 4 && index % 6 === 2) return "out_of_stock";
  return "in_stock";
}

function buildOffers(product: RawProduct, row: number, variantOffset = 0): StoreOffer[] {
  return product.prices.flatMap((price, index) => {
    if (price === null) return [];
    const adjusted = typeof price === "number" ? price + variantOffset : null;
    const availability = price === "call_for_price" ? "call_for_price" : statusFor(row, index, product.slug);
    const history = [
      ...(adjusted === null ? [] : [
        { date: "Oct 20", price: adjusted + 2600 },
        { date: "Oct 27", price: adjusted + 1700 },
        { date: "Nov 03", price: adjusted + 900 },
        { date: "Nov 10", price: adjusted + 1400 },
        { date: "Nov 14", price: adjusted },
      ]),
    ];
    return [{
      store: raw.stores[index],
      price: availability === "call_for_price" ? null : adjusted,
      regularPrice: index === row % 5 && adjusted !== null ? adjusted + 3500 : undefined,
      availability,
      updated: product.slug === "asus-zenbook-14-ux3405ma" && index === 4 ? "2 days ago" : recent[index],
      url: storeUrls[raw.stores[index]],
      history,
    }];
  });
}

function buildProduct(product: RawProduct, row: number): ProductSummary {
  const primary: Variant = {
    id: "8gb-512gb",
    label: `${product.cpu} · ${product.ram} · ${product.storage}`,
    specs: { Processor: product.cpu, Memory: product.ram, Storage: product.storage, Display: product.display },
  };
  const variants: Variant[] = [primary];
  if ([0, 1, 4, 6].includes(row)) {
    const alternative: Variant = {
      id: "16gb-512gb",
      label: `${product.cpu} · 16GB · ${product.storage}`,
      specs: { Processor: product.cpu, Memory: "16GB", Storage: product.storage, Display: product.display },
    };
    variants.push(alternative);
  }
  return {
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: "Laptops",
    series: product.series,
    image: product.image,
    description: `${product.brand} ${product.series} laptop with ${product.cpu}, ${product.ram} memory and fast solid-state storage.`,
    variants,
    offers: { [primary.id]: buildOffers(product, row), ...(variants[1] ? { [variants[1].id]: buildOffers(product, row, 8500) } : {}) },
  };
}

export const products: ProductSummary[] = (raw.products as RawProduct[]).map((product, index) => buildProduct(product, index));
export const stores = [...raw.stores];
export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
export const getOffers = (product: ProductSummary, variantId = product.variants[0].id) => product.offers[variantId] ?? [];
export const getPricedOffers = (product: ProductSummary, variantId?: string) =>
  getOffers(product, variantId).filter((offer) => offer.price !== null).sort((a, b) => a.price! - b.price!);
export const getLowestPrice = (product: ProductSummary) => {
  const prices = Object.values(product.offers).flat().filter((offer) => offer.price !== null).map((offer) => offer.price!);
  return prices.length ? Math.min(...prices) : null;
};
export const searchProducts = (query: string) => {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return products;
  return products.filter((product) => words.every((word) => `${product.name} ${product.brand} ${product.series} ${product.variants.map((variant) => variant.label).join(" ")}`.toLowerCase().includes(word)));
};
