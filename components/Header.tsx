import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFire,
  faMagnifyingGlass,
  faStore,
  faTags,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { listHeaderCategories, searchProducts } from "@/lib/ct/catalog";
import { HeaderCartButton } from "@/components/MiniCart";
import { HeaderSearch } from "@/components/HeaderSearch";
import { HeaderCompareLink } from "@/components/ProductCompare";
import { HeaderWishlistLink } from "@/components/HeaderWishlistLink";

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

async function HeaderSearchSlot() {
  await connection();
  const [categories, result] = await Promise.all([
    listHeaderCategories(),
    searchProducts("", "", { perPage: 5 }),
  ]);

  return <HeaderSearch categories={categories} products={result.products} />;
}

export function Header() {
  return (
    <header className="header">
      <div className="shell header-inner">
        <Link className="brand" href="/">
          WORK<i>/</i>SHOP
        </Link>
        <nav className="nav">
          <Link href="/products">
            <FontAwesomeIcon aria-hidden="true" icon={faStore} />
            <span>Catalog</span>
          </Link>
          <Link href="/shop-by-brand">
            <FontAwesomeIcon aria-hidden="true" icon={faTags} />
            <span>Brands</span>
          </Link>
          <Link className="nav-sale" href="/products?sale=true">
            <FontAwesomeIcon aria-hidden="true" icon={faFire} />
            <span>Sale</span>
          </Link>
          <Suspense fallback={null}>
            <HeaderCategoryLinks />
          </Suspense>
          <Suspense
            fallback={
              <button
                aria-label="Loading search"
                className="header-search-trigger"
                disabled
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faMagnifyingGlass} />
              </button>
            }
          >
            <HeaderSearchSlot />
          </Suspense>
          <Link href="/account">
            <FontAwesomeIcon aria-hidden="true" icon={faUser} />
            <span>Account</span>
          </Link>
          <HeaderWishlistLink />
          <HeaderCompareLink />
          <HeaderCartButton />
        </nav>
      </div>
    </header>
  );
}
