"use client";
import { useB2BTranslations } from "./useB2BTranslations";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ScaleIcon } from "@heroicons/react/24/outline";
import {
  B2B_COMPARE_LIMIT,
  businessCompareKey,
  parseBusinessCompare,
  resolveBusinessCompare,
  toggleBusinessCompare,
} from "@/lib/b2b/compare";
import { useToast } from "@/components/Toast";
import { useB2B } from "./B2BProvider";
import s from "./B2BCompare.module.css";
const Context = createContext<{
  ids: string[];
  ready: boolean;
  toggle: (id: string) => void;
  clear: () => void;
} | null>(null);
export function B2BCompareProvider({ children }: { children: ReactNode }) {
  const { state } = useB2B();
  const key = state ? businessCompareKey(state) : "";
  const [selection, setSelection] = useState({ key: "", ids: [] as string[] });
  const { t } = useB2BTranslations();
  const showToast = useToast();
  const ready = Boolean(key && selection.key === key);
  const ids = ready ? selection.ids : [];
  useEffect(() => {
    if (!key) return;
    const read = () => {
      let ids: string[] = [];
      try {
        ids = parseBusinessCompare(window.localStorage.getItem(key));
      } catch {
        /* Storage is optional. */
      }
      setSelection({ key, ids });
    };
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  function save(next: string[], feedback: string) {
    setSelection({ key, ids: next });
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Keep the selection available for this visit. */
    }
    showToast(feedback, "success");
  }
  function toggle(id: string) {
    if (!ready) return;
    if (!ids.includes(id) && ids.length >= B2B_COMPARE_LIMIT) {
      showToast(
        t("Compare up to {count} products. Remove a product before adding another.", {
          count: B2B_COMPARE_LIMIT,
        }),
        "error",
      );
      return;
    }
    save(
      toggleBusinessCompare(ids, id),
      ids.includes(id)
        ? t("Product removed from comparison.")
        : t("Product added to comparison."),
    );
  }
  return (
    <Context.Provider
      value={{
        ids,
        ready,
        toggle,
        clear: () => save([], t("Comparison cleared.")),
      }}
    >
      {children}
    </Context.Provider>
  );
}
function useCompare() {
  const context = useContext(Context);
  if (!context) throw new Error("B2BCompareProvider required");
  return context;
}
export function B2BCompareButton({
  productId,
  compact = false,
}: {
  productId: string;
  compact?: boolean;
}) {
  const { t } = useB2BTranslations();
  const { ids, ready, toggle } = useCompare();
  const selected = ids.includes(productId);
  return (
    <button
      className={compact ? s.iconToggle : s.toggle}
      type="button"
      aria-pressed={selected}
      aria-label={selected ? t("Remove product from compare") : t("Add product to compare")}
      title={selected ? t("Remove from compare") : t("Add to compare")}
      disabled={!ready}
      onClick={() => toggle(productId)}
    >
      <ScaleIcon aria-hidden="true" />
      {!compact && (selected ? t("Added to compare") : t("Compare"))}
    </button>
  );
}
export function B2BHeaderCompareLink() {
  const { t } = useB2BTranslations();
  const { ids } = useCompare();
  return (
    <Link
      href="/b2b/compare"
      aria-label={`Compare business products, ${ids.length} selected`}
    >
      <ScaleIcon aria-hidden="true" />
      <span>
        {t("Compare")}
        {ids.length ? ` (${ids.length})` : ""}
      </span>
    </Link>
  );
}
export function B2BComparePage() {
  const { state, busy } = useB2B();
  const { ids, ready, toggle, clear } = useCompare();
  const selections = resolveBusinessCompare(ids, state?.products || []);
  const specs = [
    ...new Set(
      selections.flatMap(
        ({ product }) =>
          product?.variants[0]?.attributes.map((a) => a.name) || [],
      ),
    ),
  ];
  return (
    <main className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>YOUR EQUIPMENT SHORTLIST</p>
          <h1>Compare your options.</h1>
          <p>
            Review up to four products side by side for your current business
            store.
          </p>
        </div>
        <Link href="/b2b/products">Continue browsing →</Link>
      </div>
      {!state || !ready ? (
        <p className={s.empty} role="status">
          {busy || state
            ? "Loading your comparison…"
            : "Your comparison is unavailable. Please retry the storefront above."}
        </p>
      ) : !ids.length ? (
        <section className={s.empty}>
          <ScaleIcon aria-hidden="true" />
          <h2>Find the right fit for your business</h2>
          <p>
            Select Compare on a product to review specifications and current
            store pricing here.
          </p>
          <Link href="/b2b/products">Explore the collection →</Link>
        </section>
      ) : (
        <>
          <div className={s.toolbar}>
            <span>
              {ids.length} of {B2B_COMPARE_LIMIT} products selected
            </span>
            <button type="button" onClick={clear}>
              Clear comparison
            </button>
          </div>
          <div
            className={s.tableWrap}
            role="region"
            aria-label="Business product comparison"
            tabIndex={0}
          >
            <table className={s.table}>
              <caption className={s.srOnly}>
                Products and specifications for your current assortment
              </caption>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  {selections.map(({ id, product }) => (
                    <th scope="col" key={id}>
                      <button
                        className={s.remove}
                        type="button"
                        onClick={() => toggle(id)}
                        aria-label={`Remove ${product?.name || "unavailable product"} from comparison`}
                      >
                        Remove ×
                      </button>
                      {product ? (
                        <>
                          <Link
                            href={`/b2b/products/${encodeURIComponent(id)}`}
                            className={s.productLink}
                          >
                            {product.image ? (
                              <img src={product.image} alt="" />
                            ) : (
                              <div className={s.noImage}>Image unavailable</div>
                            )}
                            <strong>{product.name}</strong>
                          </Link>
                          <Link
                            className={s.details}
                            href={`/b2b/products/${encodeURIComponent(id)}`}
                          >
                            View product →
                          </Link>
                        </>
                      ) : (
                        <div className={s.unavailable}>
                          <strong>Product unavailable</strong>
                          <p>
                            This product is no longer in your current
                            assortment.
                          </p>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Category",
                    value: (i: number) => selections[i].product?.category,
                  },
                  {
                    label: "SKU · primary option",
                    value: (i: number) =>
                      selections[i].product?.variants[0]?.sku,
                  },
                  {
                    label: "Current store price",
                    value: (i: number) => {
                      const p = selections[i].product;
                      return p
                        ? p.price?.formatted ||
                            (state.context
                              ? "Price unavailable"
                              : "Sign in and select a store for pricing")
                        : undefined;
                    },
                  },
                  ...specs.map((name) => ({
                    label: name.replace(/[_-]/g, " "),
                    value: (i: number) =>
                      selections[i].product?.variants[0]?.attributes.find(
                        (attribute) => attribute.name === name,
                      )?.value,
                  })),
                ].map((row, index) => (
                  <tr key={`${index}-${row.label}`}>
                    <th scope="row">{row.label}</th>
                    {selections.map(({ id }, i) => (
                      <td key={id}>{row.value(i) || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.note}>
            Specifications and prices shown are for each product’s primary
            option. Open a product to choose another option.
          </p>
        </>
      )}
    </main>
  );
}
