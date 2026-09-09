"use client";

import Drawer from "@/components/commercetools-ui/atoms/drawer";
import UIButton from "@/components/commercetools-ui/atoms/button";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import styles from "./Header.module.css";

// Shared Launchpad drawer manages focus, Escape and background interaction.
export function HeaderMobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  function close() { setOpen(false); }
  return (
    <div className={styles.mobileMenu}>
      <UIButton variant="ghost" size="fit" className={styles.menuTrigger} type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <FontAwesomeIcon icon={faBars} aria-hidden="true" />
      </UIButton>
      <Drawer isOpen={open} direction="left" onClose={close} aria-label="Explore WORK/SHOP" className="storefront-navigation-drawer">
        <div className={styles.drawerHead}>
          <span id="store-navigation-title">Explore WORK/SHOP</span>
          <UIButton variant="ghost" size="fit" type="button" aria-label="Close navigation menu" onClick={close} autoFocus><FontAwesomeIcon icon={faXmark} aria-hidden="true" /></UIButton>
        </div>
        <div onClick={(event) => { if ((event.target as HTMLElement).closest("a")) close(); }}>
          <nav aria-label="Mobile main navigation" className={styles.mobileLinks}>
            <Link href="/products">Shop all</Link>
            <Link href="/shop-by-brand">Shop by brand</Link>
            <Link href="/products?sale=true">Sale</Link>
          </nav>
          <p className={styles.menuLabel}>Shop by category</p>
          {children}
          <nav aria-label="Mobile account navigation" className={styles.mobileFooter}>
            <Link href="/account">My account</Link>
            <Link href="/account/wishlists">Wishlists</Link>
            <Link href="/compare">Compare products</Link>
          </nav>
        </div>
      </Drawer>
    </div>
  );
}
