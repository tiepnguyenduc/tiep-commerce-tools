import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faUser } from "@fortawesome/free-solid-svg-icons";
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
          <Suspense fallback={null}>
            <HeaderCategoryLinks />
          </Suspense>
          <Link href="/account">
            <FontAwesomeIcon aria-hidden="true" icon={faUser} />
            <span>Account</span>
          </Link>
          <HeaderCartButton />
        </nav>
      </div>
    </header>
  );
}
