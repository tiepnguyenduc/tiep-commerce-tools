"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { useWishlists } from "@/lib/wishlist-api";

export function HeaderWishlistLink() {
  const { wishlists, status } = useWishlists();
  const itemCount = wishlists.reduce(
    (count, wishlist) => count + wishlist.lines.length,
    0,
  );
  const href = status === "unauthenticated" ? "/account" : "/account/wishlists";

  return (
    <Link
      aria-label={`Wishlists with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
      className="header-wishlist-link"
      href={href}
    >
      <FontAwesomeIcon aria-hidden="true" icon={faHeart} />
      <span>Wishlists</span>
      {itemCount > 0 && <strong>{itemCount}</strong>}
    </Link>
  );
}
