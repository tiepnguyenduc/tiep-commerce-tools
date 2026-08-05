import Link from "next/link";
import { ModeBar } from "./ModeBar";
import { ProductCard } from "./ProductCard";
import { searchProducts } from "@/lib/ct/catalog";
import type { StoreMode } from "@/lib/types";
export async function Home({ mode }: { mode: StoreMode }) {
  const { products } = await searchProducts();
  const b2b = mode === "b2b";
  return (
    <>
      <ModeBar mode={mode} />
      <main className="shell">
        <section className="hero">
          <div>
            <span className="eyebrow">
              {b2b
                ? "Designed for teams that buy together"
                : "The workday, beautifully considered"}
            </span>
            <h1>
              {b2b ? "Procure with confidence." : "Make room for good work."}
            </h1>
            <p>
              {b2b
                ? "Contract-ready workplace essentials, business-unit purchasing, purchase orders, and visible approval paths."
                : "A thoughtful edit of furniture, light, and objects for spaces where ideas become real."}
            </p>
            <p>
              <Link className="button accent" href="/products">
                Explore the collection →
              </Link>
            </p>
          </div>
          <div className="hero-art">
            <div className="float">
              {b2b
                ? "Volume tiers + approval-ready ordering"
                : "Designed to last. Ready to ship."}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Find your zone</span>
              <h2>Shop by space</h2>
            </div>
          </div>
          <div className="categories">
            {["Workspace", "Seating", "Lighting", "Storage"].map((c, i) => (
              <Link
                href={`/products?category=${c}`}
                className="category"
                key={c}
              >
                <span>0{i + 1}</span>
                <h3>{c} →</h3>
              </Link>
            ))}
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Curated essentials</span>
              <h2>
                {b2b ? "Popular with project teams" : "Built for better days"}
              </h2>
            </div>
            <Link className="pill" href="/products">
              View all
            </Link>
          </div>
          <div className="grid">
            {products.slice(0, 3).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
