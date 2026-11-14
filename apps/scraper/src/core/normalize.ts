import type { Availability } from "@/apps/scraper/src/adapters/types";

const banglaDigits: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

export function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const western = [...value].map((digit) => banglaDigits[digit] ?? digit).join("");
  const firstNumber = western.replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0];
  const parsed = firstNumber ? Math.floor(Number(firstNumber)) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeTitle(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s*[|–—-]\s*(?:price in bd|bangladesh price).*$/i, "").trim();
}

export function normalizeAvailability(value: unknown, text = ""): Availability {
  const signal = `${String(value ?? "")} ${text}`.toLowerCase();
  if (/call\s+for\s+price|price\s+on\s+request/.test(signal)) return "call_for_price";
  if (/out.?of.?stock|sold.?out|unavailable/.test(signal)) return "out_of_stock";
  if (/pre.?order|preorder/.test(signal)) return "preorder";
  if (/up.?coming|coming\s+soon/.test(signal)) return "upcoming";
  if (/instock|in.?stock|ready\s+stock|available/.test(signal)) return "in_stock";
  return "unknown";
}
