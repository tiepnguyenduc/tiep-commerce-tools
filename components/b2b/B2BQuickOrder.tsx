"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { duplicateQuickOrderRows, resolveQuickOrderRow, runQuickOrderBatch, type QuickOrderRow } from "@/lib/b2b/quick-order";
import { useToast } from "@/components/Toast";
import { useB2B } from "./B2BProvider";
import s from "./B2BTools.module.css";
export function B2BQuickOrderPage() {
  const { state, busy, act, error, reload } = useB2B();
  const [rows, setRows] = useState<QuickOrderRow[]>([{ id: "1", sku: "", quantity: "1" }]);
  const sequence = useRef(1);
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, "added" | "uncertain">>({});
  const showToast = useToast();
  const scope = state
    ? JSON.stringify([
        state.customer?.id || "guest",
        state.context?.businessUnitKey || "",
        state.context?.storeKey || "",
      ])
    : "";
  const currentScope = useRef(scope); currentScope.current = scope;
  const mounted = useRef(true);
  const batchLock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setReview(false); setStatuses({}); }, [scope]);
  const duplicates = duplicateQuickOrderRows(rows);
  const resolved = rows.map((row) => ({ row, result: resolveQuickOrderRow(row, state?.products || []), duplicate: duplicates.has(row.id) }));
  const actionable = resolved.filter(({ row }) => !statuses[row.id]);
  const valid = actionable.length > 0 && actionable.every(({ result, duplicate }) => !result.error && !duplicate && Boolean(result.variant?.price));
  const allowed = Boolean(state?.customer && state.context);
  function edit(id: string, changes: Partial<QuickOrderRow>) { setReview(false); setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row)); }
  async function addBatch() {
    if (!allowed || busy || pending || !review || !valid || Object.values(statuses).includes("uncertain")) return;
    if (batchLock.current) return;
    batchLock.current = true;
    const originalScope = scope;
    setPending(true);
    const outcome = await runQuickOrderBatch(actionable,
      () => mounted.current && currentScope.current === originalScope,
      ({ result }) => result.error ? Promise.resolve(false) : act({ action: "add-to-cart", productId: result.product.id, variantId: result.variant.id, quantity: result.quantity }),
      ({ row }, success) => setStatuses((current) => ({ ...current, [row.id]: success ? "added" : "uncertain" })),
    );
    batchLock.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (outcome.uncertain) showToast(`${outcome.completed} rows confirmed added. The last result could not be confirmed; the batch has stopped. Check your bag before starting another order. Remaining rows have not been submitted.`, "error");
    else if (outcome.stopped) showToast("Your purchasing context changed. Review the remaining rows for this store.", "info");
    else showToast(`${outcome.completed} ${outcome.completed === 1 ? "row" : "rows"} added to your business bag.`, "success");
  }
  return <main className={s.page}><div className={s.heading}><div><p className={s.eyebrow}>ORDER BY SKU</p><h1>Know what you need?</h1><p>Enter exact SKUs and quantities, review the matching options, then add them to your business bag.</p></div><Link href="/b2b/cart">View business bag →</Link></div>
    {!state && <div className={s.empty} role="status">{error ? <><p>Your assortment could not be loaded.</p><button className={s.button} disabled={busy} type="button" onClick={() => void reload()}>Try again</button></> : "Loading your assortment…"}</div>}
    {state && !allowed && <p className={s.note}>You can prepare your list now. <Link href="/b2b/account">Sign in and select a business store</Link> to see pricing and place items in your bag.</p>}
    <section className={s.order} aria-label="Quick order rows">
      {resolved.map(({ row, result, duplicate }, index) => <div key={row.id} className={s.row}>
        <label>SKU · row {index + 1}<input value={row.sku} disabled={pending || Boolean(statuses[row.id])} onChange={(event) => edit(row.id, { sku: event.target.value })} placeholder="Enter exact SKU" /></label>
        <label>Quantity<input type="number" min={1} max={10000} step={1} value={row.quantity} disabled={pending || Boolean(statuses[row.id])} onChange={(event) => edit(row.id, { quantity: event.target.value })} /></label>
        <button type="button" className={s.button} disabled={pending || Boolean(statuses[row.id]) || rows.length === 1} onClick={() => { setReview(false); setRows((current) => current.filter((item) => item.id !== row.id)); }}>Remove</button>
        {(review || statuses[row.id]) && <div className={s.preview}>{statuses[row.id] === "added" ? "Added to bag. This row will not be submitted again." : statuses[row.id] === "uncertain" ? <span className={s.error}>Result unconfirmed. Check your bag before reordering this SKU.</span> : duplicate ? <span className={s.error}>Duplicate SKU. Combine its quantity into one row.</span> : result.error ? <span className={s.error}>{result.error}</span> : <><Link href={`/b2b/products/${encodeURIComponent(result.product.id)}`}>{result.product.name}</Link> · {result.variant.sku} · {result.quantity} units<br />{allowed ? result.variant.price?.formatted || "Price unavailable for this option." : "Sign in and select a store for pricing."}</>}</div>}
      </div>)}
      <div className={s.actions}><button type="button" disabled={pending || Object.values(statuses).includes("uncertain")} onClick={() => { setReview(false); setRows((current) => [...current, { id: String(++sequence.current), sku: "", quantity: "1" }]); }}>+ Add row</button><button type="button" disabled={pending || !state} onClick={() => setReview(true)}>Review products</button><button type="button" className={s.primary} disabled={!allowed || busy || pending || !review || !valid || Object.values(statuses).includes("uncertain")} onClick={() => void addBatch()}>{pending ? "Adding rows…" : "Add reviewed rows to bag"}</button></div>
      <p className={s.note}>Quantities must be whole numbers from 1 to 10,000. Each SKU must match exactly one option in your current assortment. If an addition cannot be confirmed, processing stops so you can check your bag.</p>
    </section>
  </main>;
}
