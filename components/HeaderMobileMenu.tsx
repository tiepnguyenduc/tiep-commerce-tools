"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import styles from "./Header.module.css";

// Launchpad's left-hand navigation drawer, using native modal focus management.
export function HeaderMobileMenu({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1001px)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);
  function close() { dialog.current?.close(); }
  return (
    <div className={styles.mobileMenu}>
      <button ref={trigger} className={styles.menuTrigger} type="button" aria-label="Open navigation menu" aria-expanded={open} aria-controls="store-navigation" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <FontAwesomeIcon icon={faBars} aria-hidden="true" />
      </button>
      <dialog id="store-navigation" ref={dialog} className={styles.drawer} aria-labelledby="store-navigation-title" onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX > bounds.right || event.clientX < bounds.left) close(); } }}>
        <div className={styles.drawerHead}>
          <span id="store-navigation-title">Explore WORK/SHOP</span>
          <button type="button" aria-label="Close navigation menu" onClick={close} autoFocus><FontAwesomeIcon icon={faXmark} aria-hidden="true" /></button>
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
      </dialog>
    </div>
  );
}
