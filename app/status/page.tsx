import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { scrapeRuns, stores } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Data refresh status",
  description: "See when Damjani last checked laptop prices at each retailer.",
};

function formatDate(value: Date | null) {
  if (!value) return "Not finished yet";
  return value.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  });
}

function runState(run: { finishedAt: Date | null; succeeded: number; failed: number }) {
  if (!run.finishedAt) return { label: "Running", className: "status-running" };
  if (run.failed > 0 && run.succeeded === 0) return { label: "Failed", className: "status-failed" };
  if (run.failed > 0) return { label: "Partial", className: "status-partial" };
  return { label: "Complete", className: "status-complete" };
}

export default async function StatusPage() {
  let latestRuns: Array<{
    storeName: string;
    storeSlug: string;
    jobType: string;
    startedAt: Date;
    finishedAt: Date | null;
    attempted: number;
    succeeded: number;
    failed: number;
  }> = [];
  let unavailable = false;

  try {
    const rows = await db.select({
      storeName: stores.name,
      storeSlug: stores.slug,
      jobType: scrapeRuns.jobType,
      startedAt: scrapeRuns.startedAt,
      finishedAt: scrapeRuns.finishedAt,
      attempted: scrapeRuns.attempted,
      succeeded: scrapeRuns.succeeded,
      failed: scrapeRuns.failed,
    }).from(scrapeRuns)
      .innerJoin(stores, eq(scrapeRuns.storeId, stores.id))
      .orderBy(desc(scrapeRuns.startedAt))
      .limit(50);

    const seenStores = new Set<string>();
    latestRuns = rows.filter((run) => {
      if (seenStores.has(run.storeSlug)) return false;
      seenStores.add(run.storeSlug);
      return true;
    });
  } catch (error) {
    unavailable = true;
    console.error("Unable to load scraper status:", error);
  }

  return <section className="status-page shell">
    <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Data status</span></div>
    <div className="status-heading">
      <span className="eyebrow">PRICE DATA FRESHNESS</span>
      <h1>Store refresh status</h1>
      <p>Recent laptop price checks, based on Damjani’s scraper run records. Times are shown in Bangladesh time.</p>
    </div>
    <div className="status-schedule"><strong>Scheduled refresh</strong><span>Daily, around 3:00 AM Bangladesh time. GitHub may start scheduled jobs a little later.</span></div>
    {unavailable ? <div className="status-empty"><strong>Status is temporarily unavailable.</strong><span>Please try again shortly.</span></div>
      : latestRuns.length === 0 ? <div className="status-empty"><strong>No scraper runs recorded yet.</strong><span>Run history will appear here after a scheduled or manual scrape.</span></div>
        : <div className="status-list">{latestRuns.map((run) => {
          const state = runState(run);
          const job = run.jobType.replace(/^discover-refresh:/, "Laptop refresh · ");
          return <article className="status-card" key={run.storeSlug}>
            <div className="status-card-heading"><div><span className="eyebrow">{job}</span><h2>{run.storeName}</h2></div><span className={`status-badge ${state.className}`}>{state.label}</span></div>
            <p className="status-updated">Started {formatDate(run.startedAt)}{run.finishedAt ? ` · finished ${formatDate(run.finishedAt)}` : ""}</p>
            <div className="status-counts"><span><strong>{run.succeeded}</strong> saved</span><span><strong>{run.attempted}</strong> attempted</span><span><strong>{run.failed}</strong> failed</span></div>
          </article>;
        })}</div>}
    <p className="status-footnote">Retailer pages and prices can change between refreshes. Always confirm the current price and stock with the store.</p>
  </section>;
}
