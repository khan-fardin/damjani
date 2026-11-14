import { RobotsPolicy } from "@/apps/scraper/src/core/robots";

const userAgent = () => {
  const contact = process.env.SCRAPER_CONTACT;
  if (!contact) throw new Error("Set SCRAPER_CONTACT to a monitored email or project contact URL before scraping.");
  return `damjani-price-checker/0.1 (+${contact})`;
};

const lastRequestByOrigin = new Map<string, number>();
const minIntervalMs = 1000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class StoreFetcher {
  private readonly robots = new RobotsPolicy();

  async checkAllowed(url: URL) {
    await this.robots.assertAllowed(url);
  }

  async text(url: string, options: { skipRobots?: boolean } = {}): Promise<string> {
    const target = new URL(url);
    if (!options.skipRobots) await this.robots.assertAllowed(target);
    await this.rateLimit(target.origin);

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(target, {
          headers: {
            "user-agent": userAgent(),
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5",
          },
          signal: AbortSignal.timeout(30_000),
          redirect: "error",
        });
        if (response.status === 429 || response.status >= 500) {
          if (attempt === 2) throw new Error(`${response.status} from ${target.origin}`);
          const retryAfter = Number(response.headers.get("retry-after"));
          await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
          continue;
        }
        if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${target.pathname}`);
        return await response.text();
      } catch (error) {
        lastError = error;
        if (attempt < 2) await wait(500 * 2 ** attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Request failed: ${target}`);
  }

  private async rateLimit(origin: string) {
    const previous = lastRequestByOrigin.get(origin) ?? 0;
    const remaining = minIntervalMs - (Date.now() - previous);
    if (remaining > 0) await wait(remaining);
    lastRequestByOrigin.set(origin, Date.now());
  }
}
