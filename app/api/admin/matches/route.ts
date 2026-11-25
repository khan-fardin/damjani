import { and, eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { brands, listings, matchReviews, products, stores, variants } from "@/db/schema";
import { LIVE_CATALOG_CACHE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.ADMIN_REVIEW_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Invalid or missing review token." }, { status: 401 });

  const body = await request.json().catch(() => null) as { action?: string; reviewId?: number } | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  if (body.action === "list") {
    const rows = await db.select({
      reviewId: matchReviews.id,
      listingId: listings.id,
      title: listings.rawTitle,
      url: listings.url,
      price: listings.currentPrice,
      availability: listings.availability,
      specs: listings.rawSpecs,
      store: stores.name,
      score: matchReviews.score,
      reasons: matchReviews.reasons,
      suggestedVariant: variants.label,
      product: products.name,
      brand: brands.name,
      canonicalSpecs: variants.specs,
    }).from(matchReviews).innerJoin(listings, eq(matchReviews.listingId, listings.id))
      .innerJoin(stores, eq(listings.storeId, stores.id))
      .leftJoin(variants, eq(matchReviews.suggestedVariant, variants.id))
      .leftJoin(products, eq(variants.productId, products.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(matchReviews.status, "open"));
    return NextResponse.json({ reviews: rows });
  }

  if (!Number.isInteger(body.reviewId) || body.reviewId! < 1 || !["approve", "reject"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Choose an open review and an approve/reject action." }, { status: 400 });
  }
  const [review] = await db.select({
    id: matchReviews.id,
    listingId: matchReviews.listingId,
    suggestedVariant: matchReviews.suggestedVariant,
    score: matchReviews.score,
  }).from(matchReviews).where(and(eq(matchReviews.id, body.reviewId!), eq(matchReviews.status, "open"))).limit(1);
  if (!review) return NextResponse.json({ error: "This review is no longer open." }, { status: 404 });

  if (body.action === "approve") {
    if (!review.suggestedVariant) return NextResponse.json({ error: "This review has no suggested variant." }, { status: 409 });
    await db.update(listings).set({ variantId: review.suggestedVariant, matchStatus: "matched_manual", matchConfidence: review.score }).where(eq(listings.id, review.listingId));
  } else {
    await db.update(listings).set({ matchStatus: "unmatched", matchConfidence: null }).where(eq(listings.id, review.listingId));
  }
  await db.update(matchReviews).set({
    status: body.action === "approve" ? "approved" : "rejected",
    resolvedBy: "admin",
    resolvedAt: new Date(),
  }).where(eq(matchReviews.id, review.id));
  if (body.action === "approve") revalidateTag(LIVE_CATALOG_CACHE_TAG);
  return NextResponse.json({ ok: true });
}
