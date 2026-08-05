import { ProductCard } from "@/components/ProductCard";
import { searchProducts } from "@/lib/ct/catalog";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const p = await searchParams;
  const result = await searchProducts(p.q, p.category);
  return (
    <main className="shell">
      <header className="page-head">
        <span className="eyebrow">Catalog / {result.total} results</span>
        <h1>Objects for good work.</h1>
      </header>
      <form className="filters">
        <input
          className="field"
          name="q"
          defaultValue={p.q}
          placeholder="Search products, materials, SKU…"
        />
        <select className="field" name="category" defaultValue={p.category}>
          <option value="">All categories</option>
          {result.facets.categories.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button className="button">Search</button>
      </form>
      <div className="grid">
        {result.products.map((x) => (
          <ProductCard key={x.id} product={x} />
        ))}
      </div>
    </main>
  );
}
