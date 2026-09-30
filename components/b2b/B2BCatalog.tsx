"use client";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { businessCategories, filterBusinessProducts } from "@/lib/b2b/catalog-navigation";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
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
  function updateFilters(changes: { q?: string; category?: string }) {
    const next = new URLSearchParams(params.toString());
    if ("category" in changes) next.delete("categoryId");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    window.history.replaceState(null, "", `${pathname}${next.size ? `?${next}` : ""}${window.location.hash}`);
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
        {!state ? (
          <div className={s.empty}>
            {busy
              ? "Loading your collection…"
              : "The collection is unavailable. Please try again above."}
          </div>
        ) : filtered.length ? (
          <div className={s.products}>
            {filtered.slice(0, home ? 8 : undefined).map((p) => (
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
      </section>
    </main>
  );
}

export function B2BCatalog({ home = false }: { home?: boolean }) {
  return <Suspense fallback={<main className={s.main}><div className={s.empty}>Loading your collection…</div></main>}><CatalogContent home={home} /></Suspense>;
}
