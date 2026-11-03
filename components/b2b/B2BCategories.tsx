"use client";
import Link from "next/link";
import type { B2BNavigationCategory } from "@/lib/b2b/types";
import { businessCatalogUrl } from "@/lib/b2b/catalog-navigation";
import { useB2BNavigation } from "./useB2BNavigation";
import s from "./B2BTools.module.css";
function Children({ categories }: { categories: B2BNavigationCategory[] }) {
  return (
    <ul>
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={businessCatalogUrl({
              categoryId: category.id,
              category: category.name,
            })}
          >
            {category.name}
          </Link>
          {category.children.length > 0 && (
            <Children categories={category.children} />
          )}
        </li>
      ))}
    </ul>
  );
}
export function B2BCategoriesPage() {
  const { categories, loading, error, retry } = useB2BNavigation();
  return (
    <main className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>EXPLORE BY CATEGORY</p>
          <h1>The right equipment, easier to find.</h1>
          <p>
            Browse the business collection by equipment type and find the parts
            and machinery your project needs.
          </p>
        </div>
        <Link href="/b2b/products">Shop all products →</Link>
      </div>
      {loading ? (
        <p className={s.empty} role="status">
          Loading categories…
        </p>
      ) : error ? (
        <div className={s.empty}>
          <p>We couldn’t load the categories.</p>
          <button className={s.button} type="button" onClick={retry}>
            Try again
          </button>
        </div>
      ) : !categories.length ? (
        <p className={s.empty}>No categories are available yet.</p>
      ) : (
        <div className={s.grid}>
          {categories.map((category) => (
            <section key={category.id} className={s.category}>
              <h2>
                <Link
                  href={businessCatalogUrl({
                    categoryId: category.id,
                    category: category.name,
                  })}
                >
                  {category.name} ↗
                </Link>
              </h2>
              <Children categories={category.children} />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
