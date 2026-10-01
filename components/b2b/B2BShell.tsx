"use client";
import { useB2BTranslations } from "./useB2BTranslations";
import Link from "next/link";
import { StorefrontAnnouncement } from "../StorefrontAnnouncement";
import { useState } from "react";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ShoppingBagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/commercetools-ui/atoms/button";
import { useB2B } from "./B2BProvider";
import { B2BHeaderNavigation, B2BHeaderSearch } from "./B2BHeaderNavigation";
import { B2BHeaderWishlistLink } from "./B2BWishlist";
import { B2BHeaderCompareLink } from "./B2BCompare";
import s from "./B2B.module.css";
export function B2BShell({ children }: { children: React.ReactNode }) {
  const { t, locale } = useB2BTranslations();
  const { state, busy, error, reload, act } = useB2B();
  const [unitKey, setUnitKey] = useState("");
  const unit =
    state?.businessUnits.find(
      (u) => u.key === (unitKey || state.context?.businessUnitKey),
    ) ?? state?.businessUnits[0];
  const activeUnit = state?.businessUnits.find(
    (item) => item.key === state.context?.businessUnitKey,
  );
  const activeStore = activeUnit?.stores.find(
    (store) => store.key === state?.context?.storeKey,
  );
  return (
    <div className={`${s.root} ct-ui`} lang={locale}>
      <StorefrontAnnouncement business />
      <header className={s.header}>
        <Link href="/b2b" className={s.logo}>
          WORK<span>/</span>SHOP<small>EQUIPMENT & PARTS</small>
        </Link>
        <B2BHeaderSearch />
        <div className={s.headerActions}>
          <Link href="/b2b/account" aria-label={t("Business account")}>
            <UserIcon />
            <span>
              <small>
                {state?.customer ? t("Welcome back") : t("Business account")}
              </small>
              <strong>
                {state?.customer?.firstName ||
                  (state?.customer
                    ? t("Your account")
                    : t("Sign in / Register"))}
              </strong>
            </span>
          </Link>
          <B2BHeaderCompareLink />
          <B2BHeaderWishlistLink />
          <Link
            href="/b2b/cart"
            aria-label={`Business bag, ${t("{count} items", { count: state?.cart?.itemCount ?? 0 })}`}
          >
            <ShoppingBagIcon />
            <span>
              <small>{t("Purchasing bag")}</small>
              <strong>
                {t("{count} items", { count: state?.cart?.itemCount ?? 0 })}
              </strong>
            </span>
            <b className={s.mobileBagCount}>{state?.cart?.itemCount ?? 0}</b>
          </Link>
        </div>
      </header>
      <B2BHeaderNavigation />
      <div className={s.context}>
        <BuildingOffice2Icon />
        <div>
          <strong>{activeUnit?.name || t("Your purchasing workspace")}</strong>
          <span>
            {state?.context
              ? `${activeStore?.name || state.context.storeKey} · ${state.context.country} · ${state.context.currency}`
              : state?.customer
                ? t(
                    "Choose a business and store to access your assortment and prices",
                  )
                : t(
                    "Sign in to access your company’s assortment and agreed prices",
                  )}
          </span>
        </div>
        {state?.customer ? (
          <>
            <label>
              {t("Business unit")}
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
              {t("Store")}
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
                    ? t("Select a store")
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
            {t("Sign in to your business")} <ArrowRightIcon />
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
            {t("Try again")}
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
          <Link href="/b2b/search">Search equipment</Link>
          <Link href="/b2b/categories">{t("All categories")}</Link>
          <Link href="/b2b/wishlist">{t("Saved products")}</Link>
          <Link href="/b2b/quick-order">Quick order by SKU</Link>
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
