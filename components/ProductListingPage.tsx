import Link from "next/link";
import { AutoSubmitFilterForm } from "@/components/AutoSubmitFilterForm";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { ProductCard } from "@/components/ProductCard";
import { listHeaderCategories, searchProducts } from "@/lib/ct/catalog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faChevronRight,
  faMagnifyingGlass,
  faSliders,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

export type ProductSearchParams = {
  q?: string;
  category?: string;
  categoryId?: string;
  color?: string;
  price?: string;
  sort?: string;
  page?: string;
};

const priceRanges = [
  { label: "Under $25", value: "-25" },
  { label: "$25 - $50", value: "25-50" },
  { label: "$50 - $100", value: "50-100" },
  { label: "$100 - $200", value: "100-200" },
  { label: "Over $200", value: "200-" },
];

const productsPerPage = 12;
const popularSearches = ["desk", "chair", "lamp", "storage"];
const sortLabels: Record<string, string> = {
  "price-asc": "Price: Low to high",
  "price-desc": "Price: High to low",
  "name-asc": "Name A-Z",
};

function listingHref(basePath: string, params: ProductSearchParams) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function pageHref(basePath: string, params: ProductSearchParams, page: number) {
  return listingHref(basePath, { ...params, page: String(page) });
}

function removeParamsHref(
  basePath: string,
  params: ProductSearchParams,
  keys: (keyof ProductSearchParams)[],
) {
  const next = { ...params };
  keys.forEach((key) => delete next[key]);
  delete next.page;
  return listingHref(basePath, next);
}

export async function ProductListingPage({
  basePath,
  searchParams,
  variant = "catalog",
}: {
  basePath: "/products" | "/search";
  searchParams: ProductSearchParams;
  variant?: "catalog" | "search";
}) {
  const p = searchParams;
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
  const currentParams: ProductSearchParams = {
    q: p.q,
    category: selectedCategoryName,
    categoryId: p.categoryId,
    color: p.color,
    price: p.price,
    sort: p.sort,
  };
  const selectedPriceLabel =
    priceRanges.find((range) => range.value === p.price)?.label ?? "";
  const activeFilters = [
    p.q
      ? {
          label: "Search",
          value: p.q,
          href: removeParamsHref(basePath, currentParams, ["q"]),
        }
      : null,
    selectedCategoryName
      ? {
          label: "Category",
          value: selectedCategoryName,
          href: removeParamsHref(basePath, currentParams, [
            "category",
            "categoryId",
          ]),
        }
      : null,
    p.color
      ? {
          label: "Color",
          value: p.color,
          href: removeParamsHref(basePath, currentParams, ["color"]),
        }
      : null,
    selectedPriceLabel
      ? {
          label: "Price",
          value: selectedPriceLabel,
          href: removeParamsHref(basePath, currentParams, ["price"]),
        }
      : null,
    p.sort
      ? {
          label: "Sort",
          value: sortLabels[p.sort] ?? "Custom",
          href: removeParamsHref(basePath, currentParams, ["sort"]),
        }
      : null,
  ].filter((filter): filter is { label: string; value: string; href: string } =>
    Boolean(filter),
  );
  const isSearch = variant === "search";
  const title = isSearch
    ? p.q
      ? `Search results for "${p.q}"`
      : "Search products"
    : "All Products";
  const resultStart = result.total
    ? (result.pagination.page - 1) * result.pagination.perPage + 1
    : 0;
  const resultEnd = result.total
    ? Math.min(result.pagination.page * result.pagination.perPage, result.total)
    : 0;

  function FilterForm() {
    return (
      <AutoSubmitFilterForm action={basePath}>
        <input type="hidden" name="q" value={p.q ?? ""} />

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

        <Link className="clear-filters" href={basePath}>
          Clear all filters
        </Link>
      </AutoSubmitFilterForm>
    );
  }

  return (
    <main className={`shell listing-page ${isSearch ? "search-results-page" : ""}`}>
      <header className="page-head search-page-head">
        <div>
          <p className="eyebrow">
            {isSearch ? "Search keyword" : "Product catalog"}
          </p>
          <h1>{title}</h1>
          {!isSearch ? (
            <p className="muted">
              Browse products from the live catalog with filters for category,
              price, color, and sort order.
            </p>
          ) : null}
        </div>

        {!isSearch ? (
          <>
            <form action={basePath} className="catalog-search-hero" method="get">
              <label className="sr-only" htmlFor={`${variant}-search-input`}>
                Search products
              </label>
              <FontAwesomeIcon aria-hidden="true" icon={faMagnifyingGlass} />
              <input
                autoComplete="off"
                id={`${variant}-search-input`}
                name="q"
                defaultValue={p.q}
                placeholder="Search products, categories, SKU..."
                type="search"
              />
              <input type="hidden" name="sort" value={p.sort ?? ""} />
              <input type="hidden" name="price" value={p.price ?? ""} />
              <input type="hidden" name="categoryId" value={p.categoryId ?? ""} />
              <input type="hidden" name="color" value={p.color ?? ""} />
              <button className="button accent" type="submit">
                <span>Search</span>
                <FontAwesomeIcon aria-hidden="true" icon={faArrowRight} />
              </button>
            </form>

            <div className="search-quick-row" aria-label="Popular searches">
              <span>Popular:</span>
              {popularSearches.map((term) => (
                <Link
                  href={`${basePath}?q=${encodeURIComponent(term)}`}
                  key={term}
                >
                  {term}
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </header>

      {!isSearch ? (
        <section className="results-meta-panel" aria-label="Search result summary">
          <div>
            <strong>{result.total} products</strong>
            <span>
              Showing {resultStart}-{resultEnd} · Page {result.pagination.page}{" "}
              of {result.pagination.totalPages}
            </span>
          </div>
          <div className="active-filter-list" aria-label="Active filters">
            {activeFilters.length ? (
              activeFilters.map((filter) => (
                <Link
                  className="active-filter-chip"
                  href={filter.href}
                  key={filter.label}
                >
                  <span>
                    {filter.label}: {filter.value}
                  </span>
                  <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
                </Link>
              ))
            ) : (
              <span className="empty-filter-chip">No filters applied</span>
            )}
          </div>
        </section>
      ) : null}

      <MobileFilterDrawer>
        <FilterForm />
      </MobileFilterDrawer>

      <div className="catalog-layout">
        <aside className="filter-panel" aria-label="Product filters">
          {!isSearch ? (
            <div className="filter-panel-head">
              <FontAwesomeIcon aria-hidden="true" icon={faSliders} />
              <strong>Refine results</strong>
            </div>
          ) : null}
          <FilterForm />
        </aside>

        <section className="catalog-results">
          {!isSearch ? (
            <div className="results-toolbar">
              <div>
                <strong>Results</strong>
                <span>
                  {activeFilters.length
                    ? `${activeFilters.length} active filter${activeFilters.length > 1 ? "s" : ""}`
                    : "All catalog items"}
                </span>
              </div>
              <Link className="toolbar-link" href={basePath}>
                <span>Reset search</span>
                <FontAwesomeIcon aria-hidden="true" icon={faChevronRight} />
              </Link>
            </div>
          ) : null}

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
                        basePath,
                        currentParams,
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
                      href={pageHref(basePath, currentParams, page)}
                      key={page}
                    >
                      {page}
                    </a>
                  ))}

                  {result.pagination.page < result.pagination.totalPages ? (
                    <a
                      className="page-link"
                      href={pageHref(
                        basePath,
                        currentParams,
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
              <Link className="button" href={basePath}>
                Clear all filters
              </Link>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
