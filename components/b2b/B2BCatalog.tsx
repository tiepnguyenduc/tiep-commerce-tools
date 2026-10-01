"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { businessCategories, filterBusinessProducts } from "@/lib/b2b/catalog-navigation";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
import { businessPage, canSortBusinessPrices, normalizeBusinessSort, sortBusinessProducts, updateBusinessQuery } from "@/lib/b2b/catalog-browsing";
import { B2BCompareButton } from "./B2BCompare";
function CatalogContent({ home = false }: { home?: boolean }) {
  const { state, busy } = useB2B();
  const params = useSearchParams();
  const pathname = usePathname();
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const categoryId = params.get("categoryId") || "";
  const products = state?.products ?? [];
  const categories = businessCategories(products);
  const filtered = filterBusinessProducts(products, category, query, categoryId);
  const pricesAllowed = canSortBusinessPrices(products, Boolean(state?.context));
  const sort = normalizeBusinessSort(params.get("sort"), pricesAllowed);
  const sorted = sortBusinessProducts(filtered, sort);
  const pagination = businessPage(sorted.length, home ? null : params.get("page"), home ? 8 : 12);
  const visible = sorted.slice(pagination.start, pagination.end);
  const paramsString = params.toString();
  useEffect(() => {
    if (!state || home) return;
    const next = new URLSearchParams(paramsString);
    if (sort === "recommended") next.delete("sort"); else next.set("sort", sort);
    if (pagination.page === 1) next.delete("page"); else next.set("page", String(pagination.page));
    if (next.toString() !== paramsString) window.history.replaceState(null, "", `${pathname}${next.size ? `?${next}` : ""}${window.location.hash}`);
  }, [state, home, pathname, paramsString, pagination.page, sort]);
  function updateFilters(changes: Record<string, string>) {
    const next = updateBusinessQuery(params.toString(), changes);
    window.history.replaceState(null, "", `${pathname}${next.size ? `?${next}` : ""}${window.location.hash}`);
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
              <span className={s.eyebrow}>THE BUSINESS COLLECTION</span>
              <h1>
                Made for
                <br />
                the way
                <br />
                <em>you work.</em>
              </h1>
              <p>
                Bring your next project together with thoughtful products and a
                purchasing workspace built around your business.
              </p>
              <Link className={s.primaryLink} href="/b2b/products">
                Explore the collection <ArrowRightIcon />
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
                Spaces with purpose.
                <br />
                Products with possibility.
              </span>
            </div>
          </section>
          <div className={s.serviceStrip}>
            <span>
              <b>01</b> Create your account
            </span>
            <span>
              <b>02</b> Connect your business
            </span>
            <span>
              <b>03</b> Select your store & shop
            </span>
          </div>
          {categories.length > 0 && (
            <section className={s.categorySection}>
              <div className={s.sectionTitle}>
                <div>
                  <span className={s.eyebrow}>FIND YOUR FOCUS</span>
                  <h2>Shop by category</h2>
                </div>
                <Link href="/b2b/products" className={s.textLink}>
                  View the collection <ArrowRightIcon />
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
          <span className={s.eyebrow}>BUSINESS COLLECTION</span>
          <h1>Products with purpose.</h1>
          <p>Discover the right pieces for your next project.</p>
        </div>
      )}
      <section id="business-products" className={s.catalogSection}>
        <div className={s.sectionTitle}>
          <div>
            <span className={s.eyebrow}>
              {state?.context
                ? "YOUR STORE ASSORTMENT"
                : "EXPLORE THE COLLECTION"}
            </span>
            <h2>{category || (home ? "Ready for your next project" : "All products")}</h2>
          </div>
          <span>{filtered.length} {filtered.length === 1 ? "product" : "products"}</span>
        </div>
        <div className={s.filters}>
          <input
            aria-label="Filter products"
            placeholder="Find a product…"
            value={query}
            onChange={(e) => updateFilters({ q: e.target.value })}
          />
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => updateFilters({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {category && !categories.includes(category) && <option value={category}>{category}</option>}
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {!home && <select aria-label="Sort products" value={sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
            <option value="recommended">Recommended</option>
            <option value="name-asc">Name: A–Z</option>
            <option value="name-desc">Name: Z–A</option>
            {pricesAllowed && <><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></>}
          </select>}
          {(category || categoryId || query) && (
            <Button
              variant="underlined"
              onClick={() => {
                updateFilters({ q: "", category: "" });
              }}
            >
              Reset filters
            </Button>
          )}
        </div>
        {!home && state && filtered.length > 0 && <p className={s.resultRange} role="status">Showing {pagination.start + 1}–{pagination.end} of {filtered.length} {filtered.length === 1 ? "product" : "products"}</p>}
        {!state ? (
          <div className={s.empty}>
            {busy
              ? "Loading your collection…"
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
                    View product <ArrowRightIcon />
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
                      ? "Price unavailable"
                      : "Sign in & select a store for pricing")}
                </div>
                <B2BCompareButton productId={p.id} />
              </article>
            ))}
          </div>
        ) : (
          <div className={s.empty}>
            <h3>No products found</h3>
            <p>
              {products.length
                ? "Try another search or category, or reset your filters to see the full collection."
                : "Your catalog will appear here when products are available."}
            </p>
          </div>
        )}
        {!home && state && pagination.pageCount > 1 && <nav className={s.pagination} aria-label="Product pages">
          {pagination.page > 1 ? <Link href={pageUrl(pagination.page - 1)}>← Previous</Link> : <span aria-disabled="true">← Previous</span>}
          <div>{Array.from({ length: pagination.pageCount }, (_, index) => index + 1).map((page) => <Link key={page} href={pageUrl(page)} aria-current={pagination.page === page ? "page" : undefined} aria-label={`Page ${page}`}>{page}</Link>)}</div>
          {pagination.page < pagination.pageCount ? <Link href={pageUrl(pagination.page + 1)}>Next →</Link> : <span aria-disabled="true">Next →</span>}
        </nav>}
        {home && filtered.length > 8 && <div className={s.previewLink}><Link href="/b2b/products">View the full collection →</Link></div>}
      </section>
    </main>
  );
}

export function B2BCatalog({ home = false }: { home?: boolean }) {
  return <Suspense fallback={<main className={s.main}><div className={s.empty}>Loading your collection…</div></main>}><CatalogContent home={home} /></Suspense>;
}
