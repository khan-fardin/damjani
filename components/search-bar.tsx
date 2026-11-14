"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SearchBar({ compact = false, defaultValue = "" }: { compact?: boolean; defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
  }
  return <form className={`search-form ${compact ? "search-compact" : ""}`} onSubmit={submit} role="search">
    <span className="search-icon" aria-hidden="true">⌕</span>
    <input aria-label="Search laptops" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={compact ? "Search products…" : "Search laptops, processors, brands…"} />
    {!compact && <kbd>⌘ K</kbd>}
    <button type="submit" className={compact ? "search-submit icon-button" : "search-submit"} aria-label="Search">{compact ? "↵" : "Search"}</button>
  </form>;
}
