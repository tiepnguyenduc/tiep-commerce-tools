"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { HeartIcon } from "@heroicons/react/24/outline";
import { savedProductsKey, parseSavedProducts } from "@/lib/b2b/saved-products";
import { useB2B } from "./B2BProvider";
import s from "./B2BTools.module.css";
const Context = createContext<{ ids: string[]; ready: boolean; toggle: (id: string) => void } | null>(null);
export function B2BWishlistProvider({ children }: { children: ReactNode }) {
  const { state } = useB2B();
  const key = state ? savedProductsKey(state) : "";
  const [selection, setSelection] = useState({ key: "", ids: [] as string[] });
  const ready = Boolean(key && selection.key === key);
  const ids = ready ? selection.ids : [];
  useEffect(() => {
    if (!key) return;
    const read = () => { let ids: string[] = []; try { ids = parseSavedProducts(localStorage.getItem(key)); } catch {} setSelection({ key, ids }); };
    read();
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) read(); };
    window.addEventListener("storage", storage); return () => window.removeEventListener("storage", storage);
  }, [key]);
  function toggle(id: string) {
    if (!ready) return;
    const next = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
    setSelection({ key, ids: next });
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep saved items available in memory for this visit. */ }
  }
  return <Context.Provider value={{ ids, ready, toggle }}>{children}</Context.Provider>;
}
function useSaved() { const context = useContext(Context); if (!context) throw new Error("B2BWishlistProvider required"); return context; }
export function B2BSaveButton({ productId }: { productId: string }) {
  const { ids, ready, toggle } = useSaved();
  return <button type="button" className={s.toggle} disabled={!ready} aria-pressed={ids.includes(productId)} onClick={() => toggle(productId)}><HeartIcon aria-hidden="true" />{ids.includes(productId) ? "Saved" : "Save product"}</button>;
}
export function B2BHeaderWishlistLink() {
  const { ids } = useSaved();
  return <Link href="/b2b/wishlist" aria-label={`Saved business products, ${ids.length} items`}><HeartIcon aria-hidden="true" /><span>Saved{ids.length ? ` (${ids.length})` : ""}</span></Link>;
}
export function B2BWishlistPage() {
  const { state, busy, act, error, reload } = useB2B();
  const { ids, ready, toggle } = useSaved();
  const [feedback, setFeedback] = useState("");
  const [uncertain, setUncertain] = useState<string[]>([]);
  const scope = state ? savedProductsKey(state) : "";
  const scopeRef = useRef(scope); scopeRef.current = scope;
  useEffect(() => { setFeedback(""); setUncertain([]); }, [scope]);
  return <main className={s.page}><div className={s.heading}><div><p className={s.eyebrow}>YOUR EQUIPMENT SHORTLIST</p><h1>Saved for your next project.</h1><p>Saved on this browser for your current business and store. Product availability and prices follow your current assortment.</p></div><Link href="/b2b/products">Continue browsing →</Link></div>
    {feedback && <p className={s.feedback} role="status">{feedback} <Link href="/b2b/cart">View business bag →</Link></p>}
    {!state || !ready ? <div className={s.empty} role="status">{error ? <><p>Saved products are temporarily unavailable.</p><button className={s.button} disabled={busy} type="button" onClick={() => void reload()}>Try again</button></> : "Loading saved products…"}</div> : !ids.length ? <section className={s.empty}><h2>Keep your next project in mind.</h2><p>Choose Save product while browsing to build your shortlist here.</p><Link href="/b2b/products">Explore equipment →</Link></section> : <><p className={s.note}>{ids.length} saved {ids.length === 1 ? "product" : "products"}</p><div className={s.grid}>{ids.map((id) => {
      const product = state.products.find((item) => item.id === id);
      const variant = product?.variants.length === 1 ? product.variants[0] : null;
      return <article className={s.product} key={id}>{product ? <><Link href={`/b2b/products/${encodeURIComponent(id)}`}>{product.image && <img src={product.image} alt="" />}<h2>{product.name}</h2></Link><p>{product.category}</p><p>{state.context ? product.price?.formatted || "Price unavailable" : "Sign in and select a store for pricing"}</p></> : <><h2>Product unavailable</h2><p>This saved product is no longer in your current assortment.</p></>}
        <div className={s.actions}><button type="button" onClick={() => toggle(id)}>Remove</button>{product && (variant ? <button className={s.primary} type="button" disabled={busy || !state.customer || !state.context || !variant.price || uncertain.includes(id)} onClick={async () => {
          const originalScope = scope;
          const success = await act({ action: "add-to-cart", productId: product.id, variantId: variant.id, quantity: 1 });
          if (scopeRef.current !== originalScope) return;
          setFeedback(success ? `${product.name} added to your bag.` : "The result could not be confirmed. Check your bag before adding this product again.");
          if (!success) setUncertain((current) => [...current, id]);
        }}>Add 1 to bag</button> : <Link href={`/b2b/products/${encodeURIComponent(id)}`}>Choose options →</Link>)}</div>
      </article>;
    })}</div></>}
  </main>;
}
