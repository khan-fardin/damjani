export type LaptopAttributes = {
  modelCodes: string[];
  cpu: string | null;
  ramGb: number | null;
  storageGb: number | null;
  screenIn: number | null;
};

export type CanonicalCandidate = {
  product: string;
  brand: string;
  variant: string;
  specs: Record<string, string>;
};

function valuesFor(specs: Record<string, string>, pattern: RegExp) {
  return Object.entries(specs).filter(([key]) => pattern.test(key)).map(([, value]) => value);
}

function firstCapacity(values: string[], pattern: RegExp, multiplier = 1) {
  for (const value of values) {
    const match = value.match(pattern);
    if (match) return Number(match[1]) * multiplier;
  }
  return null;
}

export function extractLaptopAttributes(title: string, specs: Record<string, string> = {}): LaptopAttributes {
  const all = `${title} ${Object.values(specs).join(" ")}`;
  const codePatterns = [
    /\b[A-Z]{1,3}\d{2,4}(?:-[A-Z0-9]{2,})+\b/gi,
    /\b\d{2}[A-Z]{2,4}\d{1,3}[A-Z0-9]*\b/gi,
    /\b\d{2}-[A-Z]{2}\d{3,}[A-Z0-9]*\b/gi,
    /\b[A-Z]\d[A-Z0-9]{3,}\b/gi,
    /\b[A-Z]\d{2,}[A-Z]{2,}\b/gi,
    /\bV\d{2}\b/gi,
  ];
  const modelCodes = [...new Set(codePatterns.flatMap((pattern) => [...all.matchAll(pattern)].map((match) => match[0].toUpperCase())))];
  const cpu = all.match(/(?:core\s*)?i[3579][ -]?\d{4,5}[a-z]?|ryzen\s*(?:ai\s*)?[3579]\s*\d{3,5}[a-z]?|core\s*ultra\s*[3579]\s*\d{3,4}[a-z]?/i)?.[0]
    ?.toLowerCase().replace(/\s+/g, " ").replace(/\s*([3579])\s+(\d)/, "$1-$2").trim() ?? null;
  const ramGb = firstCapacity([...valuesFor(specs, /ram|memory/i), title], /(\d{1,2})\s*gb\b/i);
  const storageValues = [...valuesFor(specs, /storage|ssd|hard.?disk/i), title];
  const storageMatch = storageValues.map((value) => value.match(/(\d+(?:\.\d+)?)\s*(tb|gb)\s*(?:nvme|ssd|hdd|storage|pcie)?/i)).find(Boolean);
  const storageGb = storageMatch ? Number(storageMatch[1]) * (storageMatch[2].toLowerCase() === "tb" ? 1024 : 1) : null;
  const screenIn = firstCapacity([...valuesFor(specs, /display|screen/i), title], /(\d{2}(?:\.\d)?)\s*(?:inch|in\.?|")/i);
  return { modelCodes, cpu, ramGb, storageGb, screenIn };
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleSimilarity(left: string, right: string) {
  const stop = new Set(["price", "in", "bd", "bangladesh", "laptop", "notebook", "new", "with"]);
  const tokens = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1 && !stop.has(token)));
  const a = tokens(left);
  const b = tokens(right);
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.max(a.size + b.size - overlap, 1);
}

export function scoreLaptopCandidate(
  listing: { title: string; specs: Record<string, string> },
  candidate: CanonicalCandidate,
) {
  const source = extractLaptopAttributes(listing.title, listing.specs);
  const target = extractLaptopAttributes(`${candidate.brand} ${candidate.product} ${candidate.variant}`, candidate.specs);
  const listingBrand = compact(listing.title.split(/\s+/)[0] ?? "");
  const candidateBrand = compact(candidate.brand);
  if (!listingBrand || !candidateBrand || !(candidateBrand.startsWith(listingBrand) || listingBrand.startsWith(candidateBrand))) return null;

  const reasons: string[] = [];
  let score = 0.15;
  const sourceCodes = source.modelCodes.map(compact);
  const targetCodes = target.modelCodes.map(compact);
  const codeMatch = sourceCodes.some((code) => targetCodes.some((other) => code === other || (code.length >= 5 && other.length >= 5 && (code.includes(other) || other.includes(code)))));
  if (codeMatch) { score += 0.32; reasons.push("model code overlaps"); }
  const titleScore = titleSimilarity(listing.title, `${candidate.brand} ${candidate.product} ${candidate.variant}`);
  score += titleScore * 0.18;
  if (titleScore >= 0.5) reasons.push("product names are similar");

  const compare = (label: string, a: string | number | null, b: string | number | null, weight: number) => {
    if (a === null || b === null) return;
    if (String(a) === String(b)) { score += weight; reasons.push(`${label} matches`); }
    else { score -= weight * 1.5; reasons.push(`${label} differs`); }
  };
  compare("CPU", source.cpu, target.cpu, 0.13);
  compare("RAM", source.ramGb, target.ramGb, 0.10);
  compare("storage", source.storageGb, target.storageGb, 0.10);
  compare("screen size", source.screenIn, target.screenIn, 0.02);

  return { score: Math.max(0, Math.min(0.99, Number(score.toFixed(3)))), reasons };
}
