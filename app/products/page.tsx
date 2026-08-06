import { ProductCard } from "@/components/ProductCard";
import { listHeaderCategories, searchProducts } from "@/lib/ct/catalog";

const priceRanges = [
  { label: "Under $25", value: "-25" },
  { label: "$25 - $50", value: "25-50" },
  { label: "$50 - $100", value: "50-100" },
  { label: "$100 - $200", value: "100-200" },
  { label: "Over $200", value: "200-" },
];

const productsPerPage = 12;

function pageHref(
  params: {
    q?: string;
    category?: string;
    categoryId?: string;
    color?: string;
    price?: string;
    sort?: string;
  },
  page: number,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...params, page: String(page) })) {
    if (value) search.set(key, value);
  }

  return `/products?${search.toString()}`;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    categoryId?: string;
    color?: string;
    price?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const p = await searchParams;
  const categoryOptions = await listHeaderCategories();
  const selectedCategoryName =
    categoryOptions.find((category) => category.id === p.categoryId)?.name ??
    p.category ??
    "";
  const result = await searchProducts(p.q, selectedCategoryName, {
    categoryId: p.categoryId,
    color: p.color,
    price: p.price,
    sort: p.sort,
    page: p.page,
    perPage: productsPerPage,
  });
  return (
    <main className="shell">
      <header className="page-head">
        <h1>All Products</h1>
        <p className="muted">
          {result.total} products · Page {result.pagination.page} of{" "}
          {result.pagination.totalPages}
        </p>
      </header>

      <div className="catalog-layout">
        <aside className="filter-panel" aria-label="Product filters">
          <form className="filter-form">
            <input
              type="hidden"
              name="q"
              value={p.q ?? ""}
            />
            <input type="hidden" name="category" value={selectedCategoryName} />

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
                name="categoryId"
                defaultValue={p.categoryId ?? ""}
              >
                <option value="">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
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
            <input type="hidden" name="category" value={selectedCategoryName} />
            <input type="hidden" name="categoryId" value={p.categoryId ?? ""} />
            <input type="hidden" name="color" value={p.color ?? ""} />
            <button className="button">Search</button>
          </form>

          {result.products.length ? (
            <>
              <div className="grid">
                {result.products.map((x) => (
                  <ProductCard key={x.id} product={x} />
                ))}
              </div>

              {result.pagination.totalPages > 1 ? (
                <nav className="pagination" aria-label="Product pagination">
                  {result.pagination.page > 1 ? (
                    <a
                      className="page-link"
                      href={pageHref(
                        { ...p, category: selectedCategoryName },
                        result.pagination.page - 1,
                      )}
                    >
                      Previous
                    </a>
                  ) : null}

                  {Array.from(
                    { length: result.pagination.totalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <a
                      aria-current={
                        page === result.pagination.page ? "page" : undefined
                      }
                      className="page-link"
                      href={pageHref({ ...p, category: selectedCategoryName }, page)}
                      key={page}
                    >
                      {page}
                    </a>
                  ))}

                  {result.pagination.page < result.pagination.totalPages ? (
                    <a
                      className="page-link"
                      href={pageHref(
                        { ...p, category: selectedCategoryName },
                        result.pagination.page + 1,
                      )}
                    >
                      Next
                    </a>
                  ) : null}
                </nav>
              ) : null}
            </>
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
