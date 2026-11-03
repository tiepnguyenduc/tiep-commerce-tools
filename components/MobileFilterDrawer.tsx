"use client";

import styles from "./StorefrontCatalog.module.css";
import Drawer from "@/components/commercetools-ui/atoms/drawer";
import UIButton from "@/components/commercetools-ui/atoms/button";
import { type ReactNode, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders, faXmark } from "@fortawesome/free-solid-svg-icons";

export function MobileFilterDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <UIButton
        variant="secondary"
        size="s"
        className={`mobile-filter-trigger ${styles.mobileFilter}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <FontAwesomeIcon aria-hidden="true" icon={faSliders} />
        <span>Filter</span>
      </UIButton>

      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        aria-label="Product filters"
        className={`storefront-filter-drawer ${styles.filterDrawer}`}
      >
        <div className="mobile-filter-head">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>Refine results</h2>
          </div>
          <UIButton
            variant="secondary"
            size="icon"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            ref={closeRef}
            type="button"
          >
            <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
          </UIButton>
        </div>
        {children}
      </Drawer>
    </>
  );
}
