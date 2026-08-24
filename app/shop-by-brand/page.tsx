import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import {
  listCatalogBrands,
  listProductsByBrand,
} from "@/lib/ct/catalog";
import type { Product, ProductBrandSummary } from "@/lib/types";

type BrandPageSearchParams = {
  brand?: string | string[];
};

function selectedParam(value: BrandPageSearchParams["brand"]) {
  return Array.isArray(value) ? value[0] : value;
}

function brandHref(brand: string) {
  return `/shop-by-brand?brand=${encodeURIComponent(brand)}`;
}

function brandKey(brand: string) {
  return brand.trim().toLowerCase();
}

function groupedProducts(products: Product[], brands: ProductBrandSummary[]) {
  const order = new Map(brands.map((brand, index) => [brandKey(brand.name), index]));
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    const name = product.brand?.trim() || "WORK/SHOP";
    groups.set(name, [...(groups.get(name) ?? []), product]);
  }

  return Array.from(groups.entries()).sort(
    ([brandA], [brandB]) =>
      (order.get(brandKey(brandA)) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(brandKey(brandB)) ?? Number.MAX_SAFE_INTEGER) ||
      brandA.localeCompare(brandB),
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<BrandPageSearchParams>;
}) {
  const { brand } = await searchParams;
  const selectedBrand = selectedParam(brand)?.trim() ?? "";
  const [brands, products] = await Promise.all([
    listCatalogBrands(),
    listProductsByBrand(selectedBrand),
  ]);
  const brandCount = brands.length;
  const productCount = brands.reduce((total, item) => total + item.count, 0);
  const selectedSummary = brands.find(
    (item) => brandKey(item.name) === brandKey(selectedBrand),
  );
  const grouped = selectedBrand ? [] : groupedProducts(products, brands);

  return (
    <main className="shell shop-by-brand-page">
      <header className="page-head brand-page-head">
        <div>
          <p className="eyebrow">Maker index</p>
          <h1>Shop by Brand</h1>
          <p className="muted">
            Browse workplace products by maker, from task seating and lighting
            to storage, textiles, and team tables.
          </p>
        </div>
        <dl className="brand-count-panel" aria-label="Brand catalog summary">
          <div>
            <dt>Brands</dt>
            <dd>{brandCount}</dd>
          </div>
          <div>
            <dt>Products</dt>
            <dd>{productCount}</dd>
          </div>
        </dl>
      </header>

      {brands.length ? (
        <section className="brand-nav-panel" aria-label="Shop brands">
          <div className="brand-nav-head">
            <div>
              <p className="eyebrow">Brand directory</p>
              <h2>Choose a maker</h2>
            </div>
            {selectedBrand ? (
              <Link className="toolbar-link" href="/shop-by-brand">
                View all brands
              </Link>
            ) : null}
          </div>
          <div className="brand-card-grid">
            {brands.map((brandItem) => {
              const selected = brandKey(brandItem.name) === brandKey(selectedBrand);
              return (
                <Link
                  aria-current={selected ? "page" : undefined}
                  className="brand-card"
                  href={brandHref(brandItem.name)}
                  key={brandItem.name}
                >
                  <img src={brandItem.image} alt="" />
                  <span>
                    <strong>{brandItem.name}</strong>
                    <small>
                      {brandItem.count} product{brandItem.count === 1 ? "" : "s"}
                    </small>
                  </span>
                  <em>{brandItem.categories.slice(0, 2).join(" / ")}</em>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="panel empty-state">
          <h2>No brands found</h2>
          <p className="muted">The catalog did not return brand data.</p>
        </section>
      )}

      {selectedBrand ? (
        <section className="brand-results-section" aria-labelledby="brand-results">
          <div className="results-toolbar">
            <div>
              <strong id="brand-results">
                {selectedSummary?.name ?? selectedBrand}
              </strong>
              <span>
                {products.length} product{products.length === 1 ? "" : "s"} in
                this brand
              </span>
            </div>
            <Link className="toolbar-link" href="/shop-by-brand">
              Clear brand
            </Link>
          </div>
          {products.length ? (
            <div className="grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <section className="panel empty-state">
              <h2>No products found</h2>
              <p className="muted">
                Choose another brand or return to the full brand directory.
              </p>
              <Link className="button" href="/shop-by-brand">
                View all brands
              </Link>
            </section>
          )}
        </section>
      ) : (
        <section className="brand-results-section" aria-label="Products by brand">
          {grouped.map(([brandName, group]) => (
            <section className="brand-product-group" key={brandName}>
              <div className="section-head">
                <div>
                  <p className="eyebrow">Brand collection</p>
                  <h2>{brandName}</h2>
                </div>
                <Link className="toolbar-link" href={brandHref(brandName)}>
                  View brand
                </Link>
              </div>
              <div className="grid">
                {group.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))}
        </section>
      )}
    </main>
  );
}
