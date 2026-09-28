"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ShoppingBagIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/commercetools-ui/atoms/button";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
export function B2BShell({ children }: { children: React.ReactNode }) {
  const { state, busy, error, reload, act } = useB2B();
  const path = usePathname();
  const [unitKey, setUnitKey] = useState("");
  const unit =
    state?.businessUnits.find(
      (u) => u.key === (unitKey || state.context?.businessUnitKey),
    ) ?? state?.businessUnits[0];
  return (
    <div className={`${s.root} ct-ui`}>
      <div className={s.topline}>
        <span>WORK/SHOP FOR BUSINESS</span>
        <Link href="/">Visit our retail store ↗</Link>
      </div>
      <header className={s.header}>
        <Link href="/b2b" className={s.logo}>
          WORK<span>/</span>SHOP<small>BUSINESS SUPPLY</small>
        </Link>
        <form action="/b2b/products" className={s.search}>
          <input
            name="q"
            aria-label="Search business catalog"
            placeholder="Search products, materials, essentials…"
          />
          <button aria-label="Search">
            <MagnifyingGlassIcon />
          </button>
        </form>
        <div className={s.headerActions}>
          <Link href="/b2b/account" aria-label="Business account">
            <UserIcon />
            <span>{state?.customer?.firstName || "Account"}</span>
          </Link>
          <Link
            href="/b2b/cart"
            aria-label={`Business bag, ${state?.cart?.itemCount ?? 0} items`}
          >
            <ShoppingBagIcon />
            <span>Bag {state?.cart?.itemCount ?? 0}</span>
          </Link>
        </div>
      </header>
      <nav className={s.nav} aria-label="Business navigation">
        <Link aria-current={path === "/b2b" ? "page" : undefined} href="/b2b">
          Overview
        </Link>
        <Link
          aria-current={path.includes("/products") ? "page" : undefined}
          href="/b2b/products"
        >
          Shop all
        </Link>
        <Link href="/b2b/account">Your business</Link>
        <span>Considered products. Built for business.</span>
      </nav>
      <div className={s.context}>
        <BuildingOffice2Icon />
        <div>
          <strong>Your purchasing workspace</strong>
          <span>
            {state?.context
              ? `${state.businessUnits.find((u) => u.key === state.context?.businessUnitKey)?.name || state.context.businessUnitKey} · ${state.context.storeKey} · ${state.context.currency}`
              : "Choose your business and store to see your prices"}
          </span>
        </div>
        {state?.customer ? (
          <>
            <label>
              Business unit
              <select
                disabled={busy || !state.businessUnits.length}
                value={unit?.key || ""}
                onChange={async (e) => {
                  const next = state.businessUnits.find(
                    (u) => u.key === e.target.value,
                  );
                  if (!next) return;
                  const changed = await act(
                    next.stores.length
                      ? {
                          action: "select-context",
                          businessUnitKey: next.key,
                          storeKey: next.stores[0].key,
                        }
                      : { action: "clear-context" },
                  );
                  if (changed) setUnitKey(next.key);
                }}
              >
                {!state.businessUnits.length && (
                  <option>No business unit yet</option>
                )}
                {state.businessUnits.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Store
              <select
                disabled={busy || !unit?.stores.length}
                value={
                  state.context?.businessUnitKey === unit?.key
                    ? state.context?.storeKey || ""
                    : ""
                }
                onChange={(e) => {
                  if (unit && e.target.value)
                    void act({
                      action: "select-context",
                      businessUnitKey: unit.key,
                      storeKey: e.target.value,
                    });
                }}
              >
                <option value="">
                  {unit?.stores.length
                    ? "Select a store"
                    : "Awaiting store assignment"}
                </option>
                {unit?.stores.map((store) => (
                  <option key={store.key} value={store.key}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <Link className={s.textLink} href="/b2b/account">
            Sign in to your business <ArrowRightIcon />
          </Link>
        )}
      </div>
      {error && (
        <div role="alert" className={s.alert}>
          {error}
          <Button
            variant="underlined"
            onClick={() => void reload()}
            disabled={busy}
          >
            Try again
          </Button>
        </div>
      )}
      {state?.notice && <p className={s.notice}>{state.notice}</p>}
      {busy && (
        <div role="status" className={s.progress}>
          Updating your workspace…
        </div>
      )}
      {children}
      <footer className={s.footer}>
        <div>
          <Link href="/b2b" className={s.logo}>
            WORK/SHOP
          </Link>
          <p>Good spaces start with the right partners.</p>
        </div>
        <div>
          <strong>Business essentials</strong>
          <Link href="/b2b/products">Explore the catalog</Link>
          <Link href="/b2b/account">Manage your business</Link>
          <Link href="/b2b/cart">Your purchasing bag</Link>
        </div>
        <div>
          <strong>One business. Your prices.</strong>
          <p>
            Access the assortment and pricing available
            <br />
            to your business unit and selected store.
          </p>
          <Link href="/">Shop for your home ↗</Link>
        </div>
      </footer>
    </div>
  );
}
