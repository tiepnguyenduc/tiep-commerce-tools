"use client";
import { useB2BTranslations } from "./useB2BTranslations";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  businessCategories,
  filterBusinessProducts,
} from "@/lib/b2b/catalog-navigation";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
import {
  businessPage,
  canSortBusinessPrices,
  normalizeBusinessSort,
  sortBusinessProducts,
  updateBusinessQuery,
} from "@/lib/b2b/catalog-browsing";
import { B2BSaveButton } from "./B2BWishlist";
import { B2BCompareButton } from "./B2BCompare";
function CatalogContent({
  home = false,
  search = false,
}: {
  home?: boolean;
  search?: boolean;
}) {
  const { t, locale } = useB2BTranslations();
  const { state, busy } = useB2B();
  const params = useSearchParams();
  const pathname = usePathname();
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const categoryId = params.get("categoryId") || "";
  const products = state?.products ?? [];
  const categories = businessCategories(products);
  const filtered = filterBusinessProducts(
    products,
    category,
    query,
    categoryId,
  );
  const pricesAllowed = canSortBusinessPrices(
    products,
    Boolean(state?.context),
  );
  const sort = normalizeBusinessSort(params.get("sort"), pricesAllowed);
  const sorted = sortBusinessProducts(filtered, sort);
  const pagination = businessPage(
    sorted.length,
    home ? null : params.get("page"),
    home ? 8 : 12,
  );
  const visible = sorted.slice(pagination.start, pagination.end);
  const paramsString = params.toString();
  useEffect(() => {
    if (!state || home) return;
    const next = new URLSearchParams(paramsString);
    if (sort === "recommended") next.delete("sort");
    else next.set("sort", sort);
    if (pagination.page === 1) next.delete("page");
    else next.set("page", String(pagination.page));
    if (next.toString() !== paramsString)
      window.history.replaceState(
        null,
        "",
        `${pathname}${next.size ? `?${next}` : ""}${window.location.hash}`,
      );
  }, [state, home, pathname, paramsString, pagination.page, sort]);
  function updateFilters(changes: Record<string, string>) {
    const next = updateBusinessQuery(params.toString(), changes);
    window.history.replaceState(
      null,
      "",
      `${pathname}${next.size ? `?${next}` : ""}${window.location.hash}`,
    );
  }
  function pageUrl(page: number) {
    const next = updateBusinessQuery(params.toString(), { page: String(page) });
    return `${pathname}${next.size ? `?${next}` : ""}#business-products`;
  }
  return (
    <main className={s.main}>
      {home ? (
        <>
          <section className={s.hero}>
            <div>
              <span className={s.eyebrow}>{t("BUSINESS COLLECTION")}</span>
              <h1>{t("Made for the way you work.")}</h1>
              <p>
                {t(
                  "Bring your next project together with thoughtful products and a purchasing workspace built around your business.",
                )}
              </p>
              <Link className={s.primaryLink} href="/b2b/products">
                {t("Explore the collection")} <ArrowRightIcon />
              </Link>
            </div>
            <div className={s.heroImage}>
              <Image
                src="/launchpad/category-banner.png"
                alt="Thoughtfully furnished workspace"
                fill
                sizes="(max-width: 720px) 100vw, 60vw"
                priority
              />
              <span>
                {t("Spaces with purpose. Products with possibility.")}
              </span>
            </div>
          </section>
          <div className={s.serviceStrip}>
            <span>
              <b>01</b> {t("Create your account")}
            </span>
            <span>
              <b>02</b> {t("Connect your business")}
            </span>
            <span>
              <b>03</b> {t("Select your store & shop")}
            </span>
          </div>
          {categories.length > 0 && (
            <section className={s.categorySection}>
              <div className={s.sectionTitle}>
                <div>
                  <span className={s.eyebrow}>{t("BUSINESS COLLECTION")}</span>
                  <h2>{t("Shop by category")}</h2>
                </div>
                <Link href="/b2b/products" className={s.textLink}>
                  {t("View the collection")} <ArrowRightIcon />
                </Link>
              </div>
              <div className={s.categories}>
                {categories.slice(0, 4).map((cat, i) => (
                  <button
                    key={cat}
                    onClick={() => {
                      updateFilters({ category: cat, q: "" });
                      document
                        .getElementById("business-products")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <Image
                      src={
                        products.find((p) => p.category === cat)?.image || ""
                      }
                      alt={cat}
                      width={360}
                      height={300}
                    />
                    <span>
                      <small>0{i + 1}</small>
                      {cat}
                      <ArrowRightIcon />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className={s.pageTitle}>
          <span className={s.eyebrow}>{t("BUSINESS COLLECTION")}</span>
          <h1>
            {search
              ? query
                ? t("Results for “{query}”", { query })
                : t("Find your next piece of equipment.")
              : t("Products with purpose.")}
          </h1>
          <p>
            {search
              ? t(
                  "Search your current business assortment by product name or SKU.",
                )
              : t("Discover the right pieces for your next project.")}
          </p>
        </div>
      )}
      <section id="business-products" className={s.catalogSection}>
        <div className={s.sectionTitle}>
          <div>
            <span className={s.eyebrow}>
              {state?.context
                ? t("YOUR STORE ASSORTMENT")
                : t("BUSINESS COLLECTION")}
            </span>
            <h2>
              {category ||
                (home ? t("Ready for your next project") : t("All products"))}
            </h2>
          </div>
          <span>
            {t(filtered.length === 1 ? "{count} product" : "{count} products", {
              count: filtered.length,
            })}
          </span>
        </div>
        <div className={s.filters}>
          <input
            aria-label="Filter products"
            placeholder={t("Find a product…")}
            value={query}
            onChange={(e) => updateFilters({ q: e.target.value })}
          />
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => updateFilters({ category: e.target.value })}
          >
            <option value="">{t("All categories")}</option>
            {category && !categories.includes(category) && (
              <option value={category}>{category}</option>
            )}
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {!home && (
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(event) => updateFilters({ sort: event.target.value })}
            >
              <option value="recommended">{t("Recommended")}</option>
              <option value="name-asc">{t("Name: A–Z")}</option>
              <option value="name-desc">{t("Name: Z–A")}</option>
              {pricesAllowed && (
                <>
                  <option value="price-asc">{t("Price: low to high")}</option>
                  <option value="price-desc">{t("Price: high to low")}</option>
                </>
              )}
            </select>
          )}
          {(category || categoryId || query) && (
            <Button
              variant="underlined"
              onClick={() => {
                updateFilters({ q: "", category: "" });
              }}
            >
              {t("Reset filters")}
            </Button>
          )}
        </div>
        {!home && state && filtered.length > 0 && (
          <p className={s.resultRange} role="status">
            {t("Showing {start}–{end} of {count}", {
              start: pagination.start + 1,
              end: pagination.end,
              count: filtered.length,
            })}
          </p>
        )}
        {!state ? (
          <div className={s.empty}>
            {busy
              ? t("Loading your collection…")
              : "The collection is unavailable. Please try again above."}
          </div>
        ) : filtered.length ? (
          <div className={s.products}>
            {visible.map((p) => (
              <article key={p.id} className={s.product}>
                <Link
                  href={`/b2b/products/${encodeURIComponent(p.id)}`}
                  className={s.productImage}
                >
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 700px) 45vw, (max-width: 1000px) 30vw, 22vw"
                  />
                  <span>
                    {t("View product")} <ArrowRightIcon />
                  </span>
                </Link>
                <p className={s.productCategory}>{p.category}</p>
                <h3>
                  <Link href={`/b2b/products/${encodeURIComponent(p.id)}`}>
                    {p.name}
                  </Link>
                </h3>
                <div className={s.price}>
                  {p.price?.formatted ??
                    (state.context
                      ? t("Price unavailable")
                      : t("Sign in & select a store for pricing"))}
                </div>
                <div className={s.productTools}>
                  <B2BCompareButton productId={p.id} />
                  <B2BSaveButton productId={p.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={s.empty}>
            <h3>{t("No products found")}</h3>
            <p>
              {products.length
                ? t(
                    "Try another search or category, or reset your filters to see the full collection.",
                  )
                : "Your catalog will appear here when products are available."}
            </p>
          </div>
        )}
        {!home && state && pagination.pageCount > 1 && (
          <nav className={s.pagination} aria-label="Product pages">
            {pagination.page > 1 ? (
              <Link href={pageUrl(pagination.page - 1)}>{t("← Previous")}</Link>
            ) : (
              <span aria-disabled="true">{t("← Previous")}</span>
            )}
            <div>
              {Array.from(
                { length: pagination.pageCount },
                (_, index) => index + 1,
              ).map((page) => (
                <Link
                  key={page}
                  href={pageUrl(page)}
                  aria-current={pagination.page === page ? "page" : undefined}
                  aria-label={`Page ${page}`}
                >
                  {page}
                </Link>
              ))}
            </div>
            {pagination.page < pagination.pageCount ? (
              <Link href={pageUrl(pagination.page + 1)}>{t("Next →")}</Link>
            ) : (
              <span aria-disabled="true">{t("Next →")}</span>
            )}
          </nav>
        )}
        {home && filtered.length > 8 && (
          <div className={s.previewLink}>
            <Link href="/b2b/products">{t("View the full collection →")}</Link>
          </div>
        )}
      </section>
    </main>
  );
}

export function B2BCatalog({
  home = false,
  search = false,
}: {
  home?: boolean;
  search?: boolean;
}) {
  const { t, locale } = useB2BTranslations();
  return (
    <Suspense
      fallback={
        <main className={s.main}>
          <div className={s.empty}>{t("Loading your collection…")}</div>
        </main>
      }
    >
      <CatalogContent home={home} search={search} />
    </Suspense>
  );
}
