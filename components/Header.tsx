import Link from "next/link";
import { HeaderMobileMenu } from "./HeaderMobileMenu";
import styles from "./Header.module.css";
import { Suspense } from "react";
import { connection } from "next/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { listHeaderCategories, searchProducts } from "@/lib/ct/catalog";
import { readCustomerProfile } from "@/lib/ct/account";
import { HeaderAccountLink } from "@/components/HeaderAccountLink";
import { HeaderCartButton } from "@/components/MiniCart";
import { HeaderSearch } from "@/components/HeaderSearch";
import { HeaderCompareLink } from "@/components/ProductCompare";
import { HeaderWishlistLink } from "@/components/HeaderWishlistLink";

async function HeaderCategoryLinks() {
  await connection();
  const categories = await listHeaderCategories();

  if (categories.length === 0) return null;

  return (
    <nav className="category-nav" aria-label="Product categories">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products?categoryId=${encodeURIComponent(category.id)}&category=${encodeURIComponent(category.name)}`}
        >
          {category.name}
        </Link>
      ))}
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
