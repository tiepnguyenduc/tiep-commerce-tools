"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Bars3Icon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { B2BNavigationCategory } from "@/lib/b2b/types";
import { businessCatalogUrl } from "@/lib/b2b/catalog-navigation";
import { createHoverIntent } from "@/lib/hover-intent";
import { useB2BNavigation } from "./useB2BNavigation";
import s from "./B2BHeaderNavigation.module.css";

const categoryUrl = (category: B2BNavigationCategory) => businessCatalogUrl({ categoryId: category.id, category: category.name });
function containsCategory(category: B2BNavigationCategory, id: string): boolean {
  return category.id === id || category.children.some((child) => containsCategory(child, id));
}

function NavigationContent() {
  const { categories, loading, error, retry } = useB2BNavigation();
  const pathname = usePathname();
  const params = useSearchParams();
  const categoryId = params.get("categoryId") || "";
  const categoryName = params.get("category") || "";
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const intent = useRef(createHoverIntent());
  const panelId = useId();
  const query = params.toString();
  const selected = categories.find((category) => category.id === openMenu);
  const groups = selected ? selected.children : categories;
  const active = (category: B2BNavigationCategory) => pathname === "/b2b/products" && (categoryId ? containsCategory(category, categoryId) : category.name === categoryName);
  const close = () => { intent.current.cancel(); setOpenMenu(null); };
  const finePointer = (event: ReactPointerEvent) => event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hoverOpen = (event: ReactPointerEvent, key: string) => { if (finePointer(event)) intent.current.open(() => setOpenMenu(key)); };
  const hoverClose = (event: ReactPointerEvent) => { if (finePointer(event)) intent.current.close(() => setOpenMenu(null)); };

  useEffect(() => { intent.current.cancel(); setOpenMenu(null); }, [pathname, query]);
  useEffect(() => () => intent.current.cancel(), []);
  useEffect(() => {
    if (!openMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) { intent.current.cancel(); setOpenMenu(null); }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); intent.current.cancel(); setOpenMenu(null); buttons.current.get(openMenu)?.focus(); }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [openMenu]);

  const trigger = (key: string, title: string, all = false, current = false) => <button
    ref={(element) => { if (element) buttons.current.set(key, element); else buttons.current.delete(key); }}
    type="button" className={all ? s.allTrigger : s.categoryTrigger}
    aria-expanded={openMenu === key} aria-controls={panelId} data-active={current}
    onClick={() => { intent.current.cancel(); setOpenMenu((value) => value === key ? null : key); }}
    onPointerEnter={(event) => hoverOpen(event, key)} onPointerLeave={hoverClose}
    onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); intent.current.cancel(); setOpenMenu(key); requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>(`#${CSS.escape(panelId)} a`)?.focus()); } }}
  >{all && <Bars3Icon aria-hidden="true" />}<span>{title}</span><ChevronDownIcon aria-hidden="true" /></button>;

  return <nav ref={root} className={s.navigation} aria-label="Business navigation"
    onPointerLeave={hoverClose}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
    <div className={s.inner}>
      <div className={s.mainLinks}>
        <Link href="/b2b" onClick={close} aria-current={pathname === "/b2b" ? "page" : undefined}>Overview</Link>
        <Link href="/b2b/products" onClick={close} aria-current={pathname === "/b2b/products" && !categoryId && !categoryName ? "page" : undefined}>Shop all</Link>
      </div>
      <div className={s.categories}>
        {categories.slice(0, 4).map((category) => <div key={category.id}>{trigger(category.id, category.name, false, active(category))}</div>)}
      </div>
      <div className={s.allMenu}>{trigger("all", "All categories", true)}</div>
      <Link className={s.accountLink} href="/b2b/quick-order" onClick={close} aria-current={pathname === "/b2b/quick-order" ? "page" : undefined}>Quick order <span aria-hidden="true">↗</span></Link>
    </div>
    <div id={panelId} className={s.panel} hidden={!openMenu} onFocus={() => intent.current.cancel()} onPointerEnter={() => intent.current.cancel()} onPointerLeave={hoverClose}>
      <div className={s.panelIntro}>
        <div className={s.toolLinks}><Link href="/b2b/categories" onClick={close}>Category directory →</Link><Link href="/b2b/search" onClick={close}>Search equipment →</Link><Link href="/b2b/quick-order" onClick={close}>Quick order by SKU →</Link><Link href="/b2b/wishlist" onClick={close}>Saved products →</Link></div>
        <span className={s.panelEyebrow}>BUSINESS COLLECTION</span>
        <h2>{selected?.name || "Find the right equipment"}</h2>
        <Link className={s.shopAll} href={selected ? categoryUrl(selected) : "/b2b/products"} onClick={close}>Shop all{selected ? ` ${selected.name}` : " products"} <span aria-hidden="true">↗</span></Link>
      </div>
      <div className={s.categoryGrid}>
        {groups.map((category) => <div key={category.id} className={s.categoryGroup}>
          <Link className={s.groupTitle} href={categoryUrl(category)} aria-current={active(category) ? "page" : undefined} onClick={close}>{category.name}<span aria-hidden="true">↗</span></Link>
          {category.children.length > 0 && <ul>{category.children.map((child) => <li key={child.id}><Link href={categoryUrl(child)} onClick={close} aria-current={pathname === "/b2b/products" && child.id === categoryId ? "page" : undefined}>{child.name}</Link></li>)}</ul>}
        </div>)}
        {loading && <p className={s.empty} role="status">Loading categories…</p>}
        {error && <div className={s.empty} role="status"><p>We couldn’t load the categories.</p><button type="button" onClick={retry}>Try again</button></div>}
        {!loading && !error && !categories.length && <p className={s.empty}>No categories are available yet.</p>}
        {selected && !selected.children.length && <p className={s.empty}>Explore all equipment and parts in {selected.name}.</p>}
      </div>
    </div>
  </nav>;
}

export function B2BHeaderNavigation() {
  return <Suspense fallback={<nav className={s.navigation} aria-label="Business navigation"><div className={s.inner}><Link href="/b2b">Overview</Link><Link href="/b2b/products">Shop all</Link></div></nav>}><NavigationContent /></Suspense>;
}

export { B2BHeaderSearch } from "./B2BHeaderSearch";
