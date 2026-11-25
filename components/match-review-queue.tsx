"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

type Review = {
  reviewId: number;
  listingId: number;
  title: string;
  url: string;
  price: number | null;
  availability: string;
  specs: Record<string, string>;
  store: string;
  score: string | null;
  reasons: { signals?: string[] } | null;
  suggestedVariant: string | null;
  product: string | null;
  brand: string | null;
  canonicalSpecs: Record<string, string> | null;
};

export function MatchReviewQueue() {
  const [token, setToken] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function send(action: string, reviewId?: number) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reviewId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed.");
      if (action === "list") setReviews(result.reviews);
      else {
        setReviews((current) => current.filter((review) => review.reviewId !== reviewId));
        setMessage(action === "approve" ? "Match approved; the listing now appears in comparisons." : "Suggestion rejected; the listing remains unmatched.");
      }
      setLoaded(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach the review service.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="review-console">
    <form className="review-access" onSubmit={(event) => { event.preventDefault(); void send("list"); }}>
      <label htmlFor="review-token">Admin review token</label>
      <div><input id="review-token" type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} required placeholder="Enter ADMIN_REVIEW_TOKEN" /><button type="submit" disabled={busy}>{busy ? "Loading…" : "Load queue"}</button></div>
      <small>The token is sent only to this site’s review endpoint and is not stored in the browser.</small>
    </form>
    {message && <p className="review-message" role="status">{message}</p>}
    {loaded && reviews.length === 0 && <div className="review-empty"><strong>No open match suggestions.</strong><span>Run <code>npm run match:reviews</code> after collecting new listings.</span></div>}
    <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.reviewId}>
      <div className="review-card-top"><span className="eyebrow">{review.store} · {review.score ? `${Math.round(Number(review.score) * 100)}% candidate score` : "Suggested match"}</span><a href={review.url} target="_blank" rel="noreferrer">Open source listing</a></div>
      <div className="review-products"><section><span>Store title</span><h2>{review.title}</h2><p>{review.price === null ? "Price unavailable" : formatPrice(review.price)} · {review.availability.replaceAll("_", " ")}</p></section><strong className="review-versus">Compare with</strong><section><span>Damjani catalog suggestion</span><h2>{review.brand} {review.product}</h2><p>{review.suggestedVariant}</p></section></div>
      {!!review.reasons?.signals?.length && <p className="review-reasons">Signals: {review.reasons.signals.join(" · ")}</p>}
      <div className="review-actions"><button type="button" disabled={busy} onClick={() => void send("approve", review.reviewId)}>Approve match</button><button type="button" className="review-reject" disabled={busy} onClick={() => void send("reject", review.reviewId)}>Reject suggestion</button></div>
    </article>)}</div>
  </div>;
}
