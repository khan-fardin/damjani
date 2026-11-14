import type { RawListing } from "@/apps/scraper/src/adapters/types";
import { normalizeAvailability, normalizeTitle, parsePrice } from "@/apps/scraper/src/core/normalize";

type JsonObject = Record<string, unknown>;

function decodeJsonLd(html: string): unknown[] {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const values: unknown[] = [];
  for (const match of scripts) {
    try { values.push(JSON.parse(match[1].trim())); } catch { /* Ignore malformed structured data. */ }
  }
  return values;
}

function flatten(value: unknown): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (!value || typeof value !== "object") return [];
  const object = value as JsonObject;
  return [object, ...flatten(object["@graph"])];
}

function firstMeta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*content=["']([^"']*)["'][^>]*>`, "i");
    const reversePattern = new RegExp(`<meta\\b(?=[^>]*content=["']([^"']*)["'])[^>]*(?:name|property)=["']${escaped}["'][^>]*>`, "i");
    const match = html.match(pattern) ?? html.match(reversePattern);
    if (match) return decodeEntities(match[1]);
  }
  return undefined;
}

function decodeEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function visibleText(html: string) {
  return decodeEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const stringValue = (value: unknown): string | undefined => typeof value === "string" ? value.trim() : undefined;
const objectValue = (value: unknown): JsonObject => value && typeof value === "object" ? value as JsonObject : {};

export function parseProductHtml(url: string, html: string): RawListing {
  const nodes = decodeJsonLd(html).flatMap(flatten);
  const product = nodes.find((node) => {
    const type = node["@type"];
    return (Array.isArray(type) ? type : [type]).some((entry) => String(entry).toLowerCase().endsWith("product"));
  }) ?? {};
  const offersValue = product.offers;
  const offer = Array.isArray(offersValue) ? objectValue(offersValue[0]) : objectValue(offersValue);
  const brandValue = product.brand;
  const brand = typeof brandValue === "string" ? brandValue : stringValue(objectValue(brandValue).name);
  const properties = Array.isArray(product.additionalProperty) ? product.additionalProperty : [];
  const specs: Record<string, string> = {};
  for (const item of properties) {
    const property = objectValue(item);
    const name = stringValue(property.name);
    const value = stringValue(property.value);
    if (name && value) specs[name] = value;
  }
  const pageText = visibleText(html);
  const textSpec = (pattern: RegExp) => pageText.match(pattern)?.[1]?.trim();
  const extractedSpecs: Record<string, string | undefined> = {
    Processor: textSpec(/Processor Model\s*:?[\s]+(.+?)(?=\s+(?:Generation|Processor Speed|Number Of Cores|Number of Cores|Cache|up to))/i),
    Memory: textSpec(/(?:Memory Size|Memory RAM|RAM Size)\s*:?\s*(\d+\s*GB)/i),
    Storage: textSpec(/(?:Storage Capacity|SSD Capacity|Storage)\s*:?\s*(\d+\s*(?:GB|TB)\s*(?:SSD|NVMe)?)/i),
    Display: textSpec(/(?:Screen Size|Display Size)\s*:?\s*(\d+(?:\.\d+)?\s*(?:inch|inches))/i),
    Graphics: textSpec(/(?:Graphics Model|GPU Chipset)\s*:?\s*([^;|]{2,60}?)(?=\s+(?:Graphics Memory|Memory Type|Keyboard|$))/i),
    Color: textSpec(/(?:Physical Specifications )?Color\s*:?\s*([A-Za-z][A-Za-z -]{2,30})(?=\s+(?:Dimensions|Weight|$))/i),
  };
  for (const [key, value] of Object.entries(extractedSpecs)) {
    if (value && !Object.keys(specs).some((existing) => existing.toLowerCase() === key.toLowerCase())) specs[key] = value;
  }

  const title = normalizeTitle(stringValue(product.name) ?? firstMeta(html, ["og:title", "twitter:title"]) ?? "");
  const rawPrice = offer.price ?? offer.lowPrice ?? firstMeta(html, ["product:price:amount", "og:price:amount"]);
  const visibleStock = pageText.match(/Stock\s*:\s*(?:In Stock|Out of Stock|Pre-Order|Up Coming)/i)?.[0] ?? "";
  const availability = normalizeAvailability(offer.availability, firstMeta(html, ["product:availability"]) || visibleStock);
  const price = availability === "call_for_price" ? null : parsePrice(rawPrice);
  const priceSpecification = objectValue(product.priceSpecification);
  const regularPrice = parsePrice(offer.highPrice ?? priceSpecification.price);
  const imageValue = Array.isArray(product.image) ? product.image[0] : product.image;
  const imageUrl = typeof imageValue === "string" ? imageValue : stringValue(objectValue(imageValue).url);
  const visibleIdentifier = pageText.match(/\b(?:PID|SKU)\s*:\s*([A-Z0-9._/-]{4,})/i)?.[1];
  const sku = stringValue(product.sku) ?? stringValue(product.productID) ?? visibleIdentifier;
  const mpn = stringValue(product.mpn);

  if (!title) throw new Error("Product page has no product title in JSON-LD or Open Graph metadata.");
  return {
    url,
    externalId: sku,
    title,
    brand,
    mpn,
    price,
    regularPrice,
    availability,
    imageUrl,
    specs,
    scrapedAt: new Date().toISOString(),
  };
}
