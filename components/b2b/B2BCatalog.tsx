"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "@/components/commercetools-ui/atoms/image";
import Button from "@/components/commercetools-ui/atoms/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
export function B2BCatalog({ home = false }: { home?: boolean }) {
  const { state, busy } = useB2B();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, []);
  const products = state?.products ?? [];
  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];
  const filtered = products.filter(
    (p) =>
      (!category || p.category === category) &&
      `${p.name} ${p.category} ${p.variants.map((v) => v.sku).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
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
                      setCategory(cat);
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
            <h2>{home ? "Ready for your next project" : "All products"}</h2>
          </div>
          <span>{filtered.length} products</span>
        </div>
        <div className={s.filters}>
          <input
            aria-label="Filter products"
            placeholder="Find a product…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {(category || query) && (
            <Button
              variant="underlined"
              onClick={() => {
                setCategory("");
                setQuery("");
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
              {state.context
                ? "Try another search or category in this store."
                : "Your catalog will appear here when products are available."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
