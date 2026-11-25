export type Availability = "in_stock" | "out_of_stock" | "preorder" | "upcoming" | "call_for_price" | "unknown";

export type PricePoint = { date: string; price: number };

export type Variant = {
  id: string;
  label: string;
  specs: Record<string, string>;
};

export type StoreOffer = {
  listingId?: number;
  store: string;
  price: number | null;
  regularPrice?: number;
  availability: Availability;
  updated: string;
  url: string;
  history: PricePoint[];
};

export type ProductSummary = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  series: string;
  image: string;
  description: string;
  variants: Variant[];
  offers: Record<string, StoreOffer[]>;
};
