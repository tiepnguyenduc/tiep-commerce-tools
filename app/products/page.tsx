import { ProductCard } from "@/components/ProductCard";
import { searchProducts } from "@/lib/ct/catalog";

const priceRanges = [
  { label: "Under $25", value: "-25" },
  { label: "$25 - $50", value: "25-50" },
  { label: "$50 - $100", value: "50-100" },
  { label: "$100 - $200", value: "100-200" },
  { label: "Over $200", value: "200-" },
];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    color?: string;
    price?: string;
    sort?: string;
  }>;
}) {
  const p = await searchParams;
  const result = await searchProducts(p.q, p.category, {
    color: p.color,
    price: p.price,
    sort: p.sort,
  });
  return (
    <main className="shell">
      <header className="page-head">
        <h1>All Products</h1>
        <p className="muted">{result.total} products</p>
      </header>

      <div className="catalog-layout">
        <aside className="filter-panel" aria-label="Product filters">
          <form className="filter-form">
            <input
              type="hidden"
              name="q"
              value={p.q ?? ""}
            />

            <label className="filter-group">
              <span className="filter-label">Sort by</span>
              <select className="field" name="sort" defaultValue={p.sort ?? ""}>
                <option value="">Newest</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="name-asc">Name A-Z</option>
              </select>
            </label>

            <fieldset className="filter-group">
              <legend className="filter-label">Price</legend>
              {priceRanges.map((range) => (
                <label className="check-row" key={range.value}>
                  <input
                    type="radio"
                    name="price"
                    value={range.value}
                    defaultChecked={p.price === range.value}
                  />
                  <span>{range.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="filter-group">
              <span className="filter-label">Category</span>
              <select
                className="field"
                name="category"
                defaultValue={p.category ?? ""}
              >
                <option value="">All categories</option>
                {result.facets.categories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>

            <label className="filter-group">
              <span className="filter-label">Color</span>
              <select className="field" name="color" defaultValue={p.color ?? ""}>
                <option value="">All colors</option>
                {result.facets.colors.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>

            <button className="button filter-apply">Apply filters</button>
            <a className="clear-filters" href="/products">
              Clear all filters
            </a>
          </form>
        </aside>

        <section>
          <form className="search-strip">
            <input
              className="field"
              name="q"
              defaultValue={p.q}
              placeholder="Search products, materials, SKU…"
            />
            <input type="hidden" name="sort" value={p.sort ?? ""} />
            <input type="hidden" name="price" value={p.price ?? ""} />
            <input type="hidden" name="category" value={p.category ?? ""} />
            <input type="hidden" name="color" value={p.color ?? ""} />
            <button className="button">Search</button>
          </form>

          {result.products.length ? (
            <div className="grid">
              {result.products.map((x) => (
                <ProductCard key={x.id} product={x} />
              ))}
            </div>
          ) : (
            <section className="panel empty-state">
              <h2>No products found</h2>
              <p className="muted">Try clearing filters or changing search.</p>
              <a className="button" href="/products">
                Clear all filters
              </a>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
