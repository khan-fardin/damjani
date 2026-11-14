import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ProductArt } from "@/components/product-art";
import { SearchBar } from "@/components/search-bar";
import { products, stores } from "@/lib/catalog";
import { siteConfig } from "@/lib/site-config";
import { formatPrice } from "@/lib/format";

export default function HomePage() {
  const trending = [products[0], products[5], products[9], products[12]];
  return <>
    <section className="hero shell">
      <div className="hero-copy"><div className="hero-kicker"><span className="kicker-dot" /> A clearer way to compare tech</div><h1>Good tech.<br /><span>Better prices.</span></h1><p className="hero-subtitle">Find the right laptop at the right price. Compare trusted Bangladesh stores, all in one place.</p><SearchBar /><div className="popular-searches"><span>Popular:</span><Link href="/search?q=Aspire">Acer Aspire</Link><i /><Link href="/search?q=gaming">Gaming laptops</Link><i /><Link href="/search?q=Vivobook">Vivobook</Link></div></div>
      <div className="hero-visual"><div className="hero-visual-note"><span className="hero-note-top"><span className="live-dot" /> PRICE CHECKED</span><strong>Every store.<br />One clear view.</strong><span className="hero-note-sub">Your next laptop, without the extra tabs.</span></div><div className="hero-device"><ProductArt tone="laptop-dark" /></div><div className="hero-stamp"><span>BDT</span><strong>৳</strong><span>MADE SIMPLE</span></div><div className="hero-crosshair">+</div></div>
      <div className="hero-foot"><span>01 — THE SMARTER WAY TO SHOP</span><span>Prices from trusted local stores <b>↓</b></span></div>
    </section>
    <section className="trust-strip"><div className="shell trust-inner"><div className="trust-intro"><span className="eyebrow">BUILT FOR YOUR SHORTLIST</span><strong>A little less searching.<br />A lot more certainty.</strong></div><div className="trust-stat"><strong>20</strong><span>laptop models<br />to explore</span></div><div className="trust-stat"><strong>05</strong><span>local stores<br />compared</span></div><div className="trust-stat"><strong>01</strong><span>clear view<br />of every price</span></div><div className="trust-aside">The prototype uses sample listings to show how your comparison will work.</div></div></section>
    <section className="trending-section shell"><div className="section-head trending-head"><div><span className="eyebrow">A GOOD PLACE TO START</span><h2>Popular comparisons <span className="heading-spark">✳</span></h2><p>Models people are looking at right now.</p></div><Link className="text-link" href="/c/laptops">Explore all laptops <span>↗</span></Link></div><div className="product-grid trending-grid">{trending.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div>
      <div className="browse-band"><div className="browse-copy"><span className="eyebrow">THE LAPTOP INDEX</span><h3>Still figuring out<br />what fits?</h3><p>Browse the whole sample catalog and compare by brand.</p><Link className="button button-dark" href="/c/laptops">Browse all laptops <span>→</span></Link></div><div className="browse-list">{["Work & study", "Gaming", "Everyday", "Premium"].map((label, i) => <Link key={label} href={`/search?q=${encodeURIComponent(["Core i5", "Gaming", "Vivobook", "MacBook"][i])}`}><span className="browse-num">0{i + 1}</span><span>{label}</span><span className="browse-arrow">↗</span></Link>)}</div><div className="browse-art"><ProductArt tone="laptop-blue" compact /></div></div>
    </section>
    <section className="stores-section" id="stores"><div className="shell stores-inner"><div><span className="eyebrow">LOCAL KNOW-HOW</span><h2>Stores we’re comparing</h2><p>Five familiar names. Sample offers today, live prices in a future release.</p></div><div className="store-logos">{stores.map((store, index) => <span key={store} className="store-logo"><i>{store.slice(0, 1)}</i>{store}<sup>0{index + 1}</sup></span>)}</div></div></section>
    <section className="how-section shell" id="how-it-works"><div className="how-title"><span className="eyebrow">THREE EASY STEPS</span><h2>Clarity, from<br />search to shortlist.</h2></div><div className="how-steps">{[{ n: "01", title: "Find your match", text: "Search a model, brand, or the specs you need." }, { n: "02", title: "Compare the details", text: "See price, stock, and store freshness together." }, { n: "03", title: "Choose with confidence", text: "Visit the store to confirm details and buy." }].map((step) => <div className="how-step" key={step.n}><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></section>
    <section className="bottom-cta shell"><div><span className="eyebrow">YOUR NEXT TAB CAN WAIT</span><h2>Let the prices<br />come to you.</h2></div><div><p>Start with the laptop you have in mind. We’ll line up the stores for you.</p><Link className="button button-light" href="/search">Start comparing <span>→</span></Link></div><span className="cta-sun">✳</span></section>
    <div className="sr-only">{siteConfig.tagline} · From {formatPrice(54500)}</div>
  </>;
}
