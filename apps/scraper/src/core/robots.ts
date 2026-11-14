type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[] };

const robotsCache = new Map<string, { groups: Group[]; loadedAt: number }>();
const cacheMs = 24 * 60 * 60 * 1000;
const crawlerToken = "damjani-price-checker";

function parseRobots(body: string): Group[] {
  const groups: Group[] = [];
  let group: Group | undefined;
  let hasRules = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!group || hasRules) {
        group = { agents: [], rules: [] };
        groups.push(group);
        hasRules = false;
      }
      group.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && group && value) {
      group.rules.push({ allow: key === "allow", path: value });
      hasRules = true;
    }
  }
  return groups;
}

function ruleMatches(rule: string, path: string) {
  const anchored = rule.endsWith("$");
  const expression = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$$/, "$");
  return new RegExp(`^${expression}${anchored ? "" : ".*"}`).test(path);
}

export class RobotsPolicy {
  async assertAllowed(target: URL) {
    const origin = target.origin;
    let cached = robotsCache.get(origin);
    if (!cached || Date.now() - cached.loadedAt > cacheMs) {
      const response = await fetch(new URL("/robots.txt", origin), {
        headers: { "user-agent": `${crawlerToken}/0.1` },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 404) {
        cached = { groups: [], loadedAt: Date.now() };
      } else if (!response.ok) {
        throw new Error(`Could not verify robots.txt for ${origin} (HTTP ${response.status}); refusing to crawl.`);
      } else {
        cached = { groups: parseRobots(await response.text()), loadedAt: Date.now() };
      }
      robotsCache.set(origin, cached);
    }

    const exact = cached.groups.filter((entry) => entry.agents.includes(crawlerToken));
    const wildcard = cached.groups.filter((entry) => entry.agents.includes("*"));
    const groups = exact.length ? exact : wildcard;
    const path = `${target.pathname}${target.search}`;
    const matching = groups.flatMap((entry) => entry.rules).filter((rule) => ruleMatches(rule.path, path));
    const decision = matching.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow))[0];
    if (decision && !decision.allow) throw new Error(`robots.txt disallows this URL: ${target.pathname}`);
  }
}
