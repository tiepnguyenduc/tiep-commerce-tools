import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listHeaderCategories } from "@/lib/ct/catalog";
import { HeaderCartButton } from "@/components/MiniCart";

async function HeaderCategoryLinks() {
  await connection();
  const categories = await listHeaderCategories();

  if (categories.length === 0) return null;

  return (
    <div className="category-nav" aria-label="Merchant Center categories">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products?categoryId=${encodeURIComponent(category.id)}&category=${encodeURIComponent(category.name)}`}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}

export function Header() {
  return (
    <>
      <header className="header shell">
        <Link className="brand" href="/">
          WORK<i>/</i>SHOP
        </Link>
        <nav className="nav">
          <Link href="/products">Catalog</Link>
          <Suspense fallback={null}>
            <HeaderCategoryLinks />
          </Suspense>
          <Link href="/account">Account</Link>
          <HeaderCartButton />
        </nav>
      </header>
    </>
  );
}
