"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { businessCatalogUrl, filterBusinessProducts } from "@/lib/b2b/catalog-navigation";
import { nextSuggestionIndex } from "@/lib/b2b/catalog-browsing";
import { useB2B } from "./B2BProvider";
import s from "./B2BHeaderSearch.module.css";

function SearchContent() {
  const { state, error } = useB2B();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const urlQuery = pathname === "/b2b/products" ? params.get("q") || "" : "";
  const category = pathname === "/b2b/products" ? params.get("category") || "" : "";
  const categoryId = pathname === "/b2b/products" ? params.get("categoryId") || "" : "";
  const [query, setQuery] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const queryString = params.toString();
  const matches = filterBusinessProducts(state?.products ?? [], category, query, categoryId);
  const suggestions = matches.slice(0, 5);
  const visible = open && query.trim().length > 0;
  useEffect(() => { setQuery(urlQuery); setOpen(false); setActive(-1); }, [urlQuery, pathname, queryString]);
  useEffect(() => { setActive(-1); }, [state?.context?.storeKey, state?.context?.businessUnitKey]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const allUrl = businessCatalogUrl({ category, categoryId, q: query });
  return <div ref={root} className={s.root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <form action="/b2b/products" className={s.form} role="search" onSubmit={() => setOpen(false)}>
      {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
      {category && <input type="hidden" name="category" value={category} />}
      <MagnifyingGlassIcon aria-hidden="true" />
      <input name="q" value={query} onChange={(event) => { setQuery(event.target.value); setActive(-1); setOpen(true); }} onFocus={() => setOpen(true)}
        role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={id} aria-activedescendant={visible && active >= 0 ? `${id}-${active}` : undefined}
        aria-label="Search business catalog" placeholder="Search equipment, parts or SKU…" autoComplete="off"
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setActive(-1); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setOpen(true);
            setActive((value) => nextSuggestionIndex(value, suggestions.length, event.key === "ArrowDown" ? "down" : "up"));
          }
          if (event.key === "Enter" && visible && active >= 0 && suggestions[active]) { event.preventDefault(); setOpen(false); router.push(`/b2b/products/${encodeURIComponent(suggestions[active].id)}`); }
        }} />
      <button type="submit">Search</button>
    </form>
    {visible && <div className={s.dropdown}>
      <div className={s.heading}>{category || "Your business assortment"}</div>
      <div id={id} role="listbox" aria-label="Product suggestions">
        {state && suggestions.map((product, index) => <Link key={product.id} id={`${id}-${index}`} role="option" aria-selected={active === index}
          className={s.option} href={`/b2b/products/${encodeURIComponent(product.id)}`} onClick={() => setOpen(false)} onPointerMove={() => setActive(index)}>
          {product.image ? <img src={product.image} alt="" width={52} height={52} /> : <span className={s.imageFallback} />}
          <span className={s.product}><strong>{product.name}</strong><small>{product.category}</small><span>{state.context ? product.price?.formatted || "Price unavailable" : "Sign in & select a store for pricing"}</span></span>
        </Link>)}
      </div>
      {!state ? <p className={s.message} role="status">{error ? "Search is unavailable. Try again using the page retry button." : "Loading your assortment…"}</p> : !suggestions.length && <p className={s.message} role="status">No matching equipment. Try a product name or SKU.</p>}
      {state && <Link className={s.viewAll} href={allUrl} onClick={() => setOpen(false)}>View all {matches.length} {matches.length === 1 ? "result" : "results"} <span aria-hidden="true">↗</span></Link>}
    </div>}
  </div>;
}
export function B2BHeaderSearch() {
  return <Suspense fallback={<div className={s.root}><div className={s.fallback}>Search equipment, parts or SKU…</div></div>}><SearchContent /></Suspense>;
}
