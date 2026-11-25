import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { clickEvents, listings, stores } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId: rawId } = await params;
  const listingId = Number(rawId);
  if (!Number.isSafeInteger(listingId) || listingId < 1) return new Response("Not found", { status: 404 });

  const [listing] = await db.select({
    url: listings.url,
    baseUrl: stores.baseUrl,
  }).from(listings).innerJoin(stores, eq(listings.storeId, stores.id))
    .where(and(eq(listings.id, listingId), eq(listings.isActive, true))).limit(1);
  if (!listing) return new Response("Offer not found", { status: 404 });

  let target: URL;
  try {
    target = new URL(listing.url);
    const storeOrigin = new URL(listing.baseUrl);
    if (target.protocol !== "https:" || target.hostname !== storeOrigin.hostname) return new Response("Invalid offer destination", { status: 400 });
  } catch {
    return new Response("Invalid offer destination", { status: 400 });
  }

  await db.insert(clickEvents).values({
    listingId,
    referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
  });
  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
