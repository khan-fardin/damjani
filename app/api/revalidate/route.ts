import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { LIVE_CATALOG_CACHE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.REVALIDATE_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function POST(request: Request) {
  if (!process.env.REVALIDATE_TOKEN?.trim()) {
    return NextResponse.json({ error: "Revalidation is not configured." }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  revalidateTag(LIVE_CATALOG_CACHE_TAG);
  return NextResponse.json({ revalidated: true, tag: LIVE_CATALOG_CACHE_TAG });
}
