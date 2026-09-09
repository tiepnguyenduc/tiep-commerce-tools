import Link from "next/link";
import { HeaderDataMenu } from "./HeaderDataMenu";
import type { HeaderCategory } from "@/lib/types";
import { HeaderMobileMenu } from "./HeaderMobileMenu";
import styles from "./Header.module.css";
import { Suspense, cache } from "react";
import { connection } from "next/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { listCatalogCategories, listHeaderCategories, searchProducts } from "@/lib/ct/catalog";
import { readCustomerProfile } from "@/lib/ct/account";
import { HeaderAccountLink } from "@/components/HeaderAccountLink";
import { HeaderCartButton } from "@/components/MiniCart";
import { HeaderSearch } from "@/components/HeaderSearch";
import { HeaderCompareLink } from "@/components/ProductCompare";
import { HeaderWishlistLink } from "@/components/HeaderWishlistLink";

const loadNavigationCategories = cache(listCatalogCategories);

async function HeaderCategoryLinks() {
  await connection();
  const categories = await loadNavigationCategories();

  if (categories.length === 0) return null;

  const href = (category: HeaderCategory) => `/products?categoryId=${encodeURIComponent(category.id)}&category=${encodeURIComponent(category.name)}`;
  const roots = categories.filter((category) => !category.parentId || !categories.some((parent) => parent.id === category.parentId));
  function childrenOf(parent: HeaderCategory, visited = new Set<string>()): React.ReactNode {
    if (visited.has(parent.id)) return null;
    const seen = new Set(visited).add(parent.id);
    return categories.filter((category) => category.parentId === parent.id).map((category) => (
      <div key={category.id}><Link href={href(category)}>{category.name}</Link>{childrenOf(category, seen)}</div>
    ));
  }
  return (
    <nav className="category-nav" aria-label="Product categories">
      {roots.map((category) => categories.some((child) => child.parentId === category.id) ? (
        <HeaderDataMenu key={category.id} className="header-category-menu">
          <summary>{category.name}</summary>
          <div className="header-data-panel"><Link href={href(category)}>Shop all {category.name}</Link>{childrenOf(category)}</div>
        </HeaderDataMenu>
      ) : <Link key={category.id} href={href(category)}>{category.name}</Link>)}
    </nav>
  );
}

async function HeaderAccountSlot() {
  await connection();

  try {
    return <HeaderAccountLink initialCustomer={await readCustomerProfile()} />;
  } catch {
    return <HeaderAccountLink initialCustomer={null} />;
  }
}

async function HeaderSearchSlot() {
  await connection();
  const [categories, result] = await Promise.all([
    listHeaderCategories(),
    searchProducts("", "", { perPage: 5 }),
  ]);

  return <HeaderSearch categories={categories} products={result.products} inline />;
}

// Adapted from Launchpad organisms/header: logo, search, utilities and navigation.
export function Header() {
  return (
    <header className={`header ${styles.header}`}>
      <div className={styles.utilityBar}>
        <div className="shell"><span>Considered design. Everyday living.</span><Link href="/b2b">Shopping for your business? <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className={`shell header-inner ${styles.mainRow}`}>
        <HeaderMobileMenu>
          <Suspense fallback={<p className={styles.menuLabel}>Loading categories…</p>}><HeaderCategoryLinks /></Suspense>
        </HeaderMobileMenu>
        <Link className={`brand ${styles.logo}`} href="/" aria-label="WORK/SHOP home">WORK<i>/</i>SHOP</Link>
        <div className={styles.search}>
          <Suspense fallback={<div className={styles.searchFallback}><FontAwesomeIcon aria-hidden="true" icon={faMagnifyingGlass} /><span>Search products, categories...</span></div>}><HeaderSearchSlot /></Suspense>
        </div>
        <nav className={`nav ${styles.actions}`} aria-label="Account and shopping tools">
          <Suspense fallback={<HeaderAccountLink initialCustomer={null} />}><HeaderAccountSlot /></Suspense>
          <HeaderWishlistLink />
          <HeaderCompareLink />
          <HeaderCartButton />
        </nav>
      </div>
      <div className={styles.navigation}>
        <div className={`shell ${styles.navigationInner}`}>
          <nav className={styles.primaryLinks} aria-label="Main navigation">
            <Link href="/products">Shop all</Link>
            <Link href="/shop-by-brand">Brands</Link>
            <Link className={styles.sale} href="/products?sale=true">Sale</Link>
          </nav>
          <div className={styles.categoryLinks}><Suspense fallback={null}><HeaderCategoryLinks /></Suspense></div>
        </div>
      </div>
    </header>
  );
}
