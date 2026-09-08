"use client";

import UIButton from "@/components/commercetools-ui/atoms/button";
import { useEffect, useId, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export function WishlistModal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="wishlist-modal-layer">
      <button
        aria-label="Close dialog"
        className="wishlist-modal-backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="wishlist-modal"
        role="dialog"
      >
        <header className="wishlist-modal-head">
          <h2 id={titleId}>{title}</h2>
          <UIButton variant="ghost" size="fit" aria-label="Close dialog" onClick={onClose} type="button">
            <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
          </UIButton>
        </header>
        {children}
      </section>
    </div>
  );
}
