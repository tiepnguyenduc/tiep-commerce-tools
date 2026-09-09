"use client";

import UIButton from "@/components/commercetools-ui/atoms/button";
import Modal from "@/components/commercetools-ui/organisms/modal";
import { useId, type ReactNode } from "react";
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

  return (
    <Modal isOpen onRequestClose={onClose} preventScroll aria={{ labelledby: titleId }} className="wishlist-modal">
        <header className="wishlist-modal-head">
          <h2 id={titleId}>{title}</h2>
          <UIButton variant="ghost" size="fit" aria-label="Close dialog" onClick={onClose} type="button">
            <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
          </UIButton>
        </header>
        {children}
    </Modal>
  );
}
