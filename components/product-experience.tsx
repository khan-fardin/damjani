"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductSummary, StoreOffer } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { getOffers, getPricedOffers } from "@/lib/catalog";
import { ProductArt } from "@/components/product-art";

function StockPill({ status }: { status: StoreOffer["availability"] }) {
  const labels = { in_stock: "In stock", out_of_stock: "Out of stock", preorder: "Pre-order", upcoming: "Up-coming", call_for_price: "Call for price", unknown: "Check with store" };
  return <span className={`stock-pill stock-${status}`}><i />{labels[status]}</span>;
}

function PriceHistory({ offer }: { offer: StoreOffer }) {
  const [range, setRange] = useState("30d");
  const prices = offer.history;
  const min = Math.min(...prices.map((point) => point.price)) * 0.985;
  const max = Math.max(...prices.map((point) => point.price)) * 1.01;
  const points = prices.map((point, index) => `${(index / (prices.length - 1)) * 600},${120 - ((point.price - min) / (max - min)) * 90}`).join(" ");
  return <section className="history-card">
    <div className="section-head history-head"><div><span className="eyebrow">PRICE MOVEMENT</span><h2>Price history</h2><p>Lowest listed price over time · sample data</p></div><div className="segmented">{["30d", "90d", "1y"].map((value) => <button key={value} className={range === value ? "selected" : ""} onClick={() => setRange(value)}>{value}</button>)}</div></div>
    <div className="chart-wrap"><div className="chart-y-labels"><span>{formatPrice(max)}</span><span>{formatPrice((max + min) / 2)}</span><span>{formatPrice(min)}</span></div><div className="chart-area"><svg viewBox="0 0 600 140" role="img" aria-label={`Sample price history for ${offer.store}`} preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity=".16"/><stop offset="100%" stopColor="#0f766e" stopOpacity="0"/></linearGradient></defs><path d={`M ${points.replaceAll(" ", " L ")} L 600 140 L 0 140 Z`} fill="url(#chartFill)"/><polyline points={points} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{prices.map((point, index) => <circle key={point.date} cx={(index / (prices.length - 1)) * 600} cy={120 - ((point.price - min) / (max - min)) * 90} r="4" fill="#fff" stroke="#0f766e" strokeWidth="2" />)}</svg><div className="chart-x-labels">{prices.map((point) => <span key={point.date}>{point.date}</span>)}</div></div></div>
    <div className="chart-foot"><span><i className="chart-legend-dot" />Lowest price</span><span>Range: {range === "30d" ? "Oct 14 — Nov 14" : range === "90d" ? "Aug 16 — Nov 14" : "Nov 2025 — Nov 2026"}</span></div>
  </section>;
}

export function ProductExperience({ product, live = false }: { product: ProductSummary; live?: boolean }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const offers = getOffers(product, variantId);
  const priced = getPricedOffers(product, variantId);
  const available = priced.filter((offer) => offer.availability === "in_stock");
  const allUnavailable = offers.length > 0 && offers.every((offer) => offer.availability !== "in_stock" && offer.availability !== "preorder");
  const winner = available[0] ?? (allUnavailable ? undefined : priced[0]);
  const average = priced.length ? Math.round(priced.reduce((sum, offer) => sum + offer.price!, 0) / priced.length) : null;
  const chartOffer = useMemo(() => winner ?? priced[0], [winner, priced]);
  const staleOffer = offers.find((offer) => offer.updated.includes("days ago"));
  const latestScrape = Math.max(...offers.map((offer) => Date.parse(offer.updated)).filter(Number.isFinite));
  const freshnessText = live && Number.isFinite(latestScrape)
    ? new Date(latestScrape).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })
    : staleOffer?.updated ?? "1h ago";
  return <>
    <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/c/laptops">Laptops</Link><span>/</span><span>{product.brand}</span><span>/</span><span>{product.series}</span></div>
    <section className="product-hero">
      <div className="product-art-large"><ProductArt tone={product.image} /></div>
      <div className="product-intro"><div className="eyebrow product-category-tag">{product.brand.toUpperCase()} <span>·</span> LAPTOPS</div><h1>{product.name}</h1><p className="product-description">{product.description}</p>
        <div className="variant-block"><span className="field-label">Choose a configuration</span><div className="variant-picker" role="group" aria-label="Laptop configuration">{product.variants.map((variant) => <button type="button" key={variant.id} aria-pressed={variantId === variant.id} onClick={() => setVariantId(variant.id)} className={variantId === variant.id ? "active" : ""}>{variant.specs.Memory} · {variant.specs.Storage}</button>)}</div></div>
        <div className={`best-price-panel ${winner ? "" : "no-best-price"}`}>
          <div className="best-panel-label"><span className="best-spark">✳</span> Lowest in-stock price</div>
          {winner ? <div className="best-panel-main"><div><strong>{formatPrice(winner.price!)}</strong><span>at {winner.store}</span></div><StockPill status={winner.availability} /></div> : <div className="best-panel-main"><strong>Price unavailable</strong><span>Check with stores for availability.</span></div>}
          {winner && average && <div className="average-note">{Math.round((1 - winner.price! / average) * 100)}% below listed average of {formatPrice(average)}</div>}
        </div>
      </div>
    </section>

    <section className="offers-section"><div className="section-head offers-heading"><div><span className="eyebrow">STORE COMPARISON · {live ? "LIVE LISTINGS" : "SAMPLE DATA"}</span><h2>Compare prices <span className="section-count">{offers.length} stores</span></h2></div><FreshnessLabel stale={Boolean(staleOffer) || (live && Number.isFinite(latestScrape) && Date.now() - latestScrape > 48 * 60 * 60 * 1000)} updated={freshnessText} /></div>
      {allUnavailable && <div className="inline-notice"><span>ⓘ</span><span>This configuration is currently unavailable at every tracked store. Listed prices may be out of date.</span></div>}
      {offers.length === 1 && <div className="inline-notice"><span>✳</span><span>{live ? `One store listing is currently connected: ${offers[0].store}.` : `Only on ${offers[0].store} in our sample catalog.`}</span></div>}
      <div className="offer-table-wrap"><table className="offer-table"><thead><tr><th>Store</th><th>Price</th><th>Availability</th><th>Updated</th><th><span className="sr-only">Visit</span></th></tr></thead><tbody>{[...offers].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)).map((offer) => <tr key={offer.store} className={winner?.store === offer.store ? "winner-row" : ""}><td><div className="store-name-cell"><span className={`store-monogram mono-${offer.store.split(" ")[0].toLowerCase()}`}>{offer.store.slice(0, 1)}</span><span>{offer.store}</span>{winner?.store === offer.store && <span className="desktop-best-badge">Lowest price</span>}</div></td><td><div className={`offer-price ${offer.price === null || offer.availability === "out_of_stock" ? "price-muted" : ""}`}>{offer.price === null ? "Call for price" : formatPrice(offer.price)}{offer.regularPrice && <del>{formatPrice(offer.regularPrice)}</del>}</div>{winner?.store === offer.store && <span className="mobile-best-badge">Lowest price</span>}</td><td><StockPill status={offer.availability} /></td><td><span className="updated-time">{offer.updated}</span></td><td><a className="visit-button" href={offer.url} target="_blank" rel="nofollow sponsored noopener" aria-label={`Visit ${offer.store}`}>Visit store <span>↗</span></a></td></tr>)}</tbody></table></div>
      <div className="offer-disclaimer">Prices are collected automatically and may differ on the store’s website. Please confirm the final price before buying.</div>
    </section>
    {chartOffer && chartOffer.history.length > 1 && <PriceHistory offer={chartOffer} />}
    <section className="specs-section"><div className="section-head"><div><span className="eyebrow">AT A GLANCE</span><h2>Specifications</h2></div><span className="specs-caption">{product.variants.find((variant) => variant.id === variantId)?.label}</span></div><div className="specs-grid">{Object.entries(product.variants.find((variant) => variant.id === variantId)?.specs ?? {}).map(([key, value]) => <div key={key} className="spec-item"><span>{key}</span><strong>{value}</strong></div>)}</div></section>
    <FreshnessNote live={live} />
  </>;
}

function FreshnessLabel({ stale, updated }: { stale: boolean; updated: string }) { return <span className={`freshness-label ${stale ? "freshness-stale" : ""}`}><i /> Updated {updated}</span>; }
function FreshnessNote({ live }: { live: boolean }) { return <div className="freshness-note"><span>◷</span><div><strong>About these prices</strong><p>{live ? "Prices and stock are collected from public retailer listings and can change. Visit the store to confirm before buying." : "Sample prices and timestamps are included to demonstrate the comparison experience. Real store data is not connected yet."}</p></div></div>; }
