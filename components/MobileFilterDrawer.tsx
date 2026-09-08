"use client";

import UIButton from "@/components/commercetools-ui/atoms/button";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders, faXmark } from "@fortawesome/free-solid-svg-icons";

export function MobileFilterDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <UIButton variant="ghost" size="fit"
        className="mobile-filter-trigger"
        onClick={() => setOpen(true)}
        type="button"
      >
        <FontAwesomeIcon aria-hidden="true" icon={faSliders} />
        <span>Filter</span>
      </UIButton>

      {open ? (
        <div className="mobile-filter-layer">
          <button
            aria-label="Close filters"
            className="mobile-filter-backdrop"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside
            aria-label="Product filters"
            aria-modal="true"
            className="mobile-filter-drawer"
            role="dialog"
          >
            <div className="mobile-filter-head">
              <div>
                <p className="eyebrow">Filters</p>
                <h2>Refine results</h2>
              </div>
              <UIButton variant="ghost" size="fit"
                aria-label="Close filters"
                onClick={() => setOpen(false)}
                ref={closeRef}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
              </UIButton>
            </div>
            {children}
          </aside>
        </div>
      ) : null}
    </>
  );
}
