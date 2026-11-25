import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  return <>
    <header className="site-header">
      <div className="header-inner shell">
        <Link href="/" className="brand-mark" aria-label="damjani home"><span className="brand-icon">d.</span><span>damjani</span></Link>
        <div className="header-search"><SearchBar compact /></div>
        <nav className="header-nav" aria-label="Main navigation"><Link href="/c/laptops">Categories <span className="nav-chevron">⌄</span></Link><Link href="/search">Browse deals</Link></nav>
      </div>
    </header>
    <div className="mobile-search shell"><SearchBar compact /></div>
  </>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="shell footer-main"><div className="footer-brand"><Link href="/" className="brand-mark"><span className="brand-icon">d.</span><span>damjani</span></Link><p>Better tech decisions start with a clear price.</p></div><div className="footer-links"><Link href="/about">About</Link><Link href="/status">Data status</Link><a href="#how-it-works">How it works</a><a href="#stores">Stores we track</a><a href="mailto:hello@damjani.com">Contact</a></div><div className="footer-note">Prices are collected automatically and may differ on the store’s website.</div></div><div className="shell footer-bottom"><span>© 2026 damjani · Bangladesh</span><span>Made for thoughtful tech shopping</span></div></footer>;
}

export const categories = siteConfig.categories;
