import type { Metadata } from "next";
import Link from "next/link";
import { MatchReviewQueue } from "@/components/match-review-queue";

export const metadata: Metadata = {
  title: "Laptop match review | Damjani",
  robots: { index: false, follow: false },
};

export default function MatchReviewPage() {
  return <section className="review-page shell"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Admin</span><span>/</span><span>Match review</span></div><div className="review-heading"><span className="eyebrow">CATALOG QUALITY</span><h1>Review product matches</h1><p>Confirm that a store listing is the same laptop configuration before its offer appears in Damjani comparisons.</p></div><MatchReviewQueue /></section>;
}
