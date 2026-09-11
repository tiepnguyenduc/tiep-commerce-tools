"use client";

import Link from "next/link";
import { HeaderDataMenu } from "./HeaderDataMenu";
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
    <HeaderDataMenu className="header-wishlist-menu">
      <summary aria-label={`Wishlists with ${itemCount} item${itemCount === 1 ? "" : "s"}`} className="header-wishlist-link">
        <FontAwesomeIcon aria-hidden="true" icon={faHeart} />
        <span>Wishlists</span>
        {itemCount > 0 && <strong>{itemCount}</strong>}
      </summary>
      <div className="header-data-panel">
        <strong>My wishlists</strong>
        {status === "loading" || status === "idle" ? <p role="status">Loading wishlists…</p>
          : status === "unauthenticated" ? <p>Sign in to see your saved products.</p>
          : status === "error" ? <p role="alert">Could not load your wishlists.</p>
          : wishlists.length === 0 ? <p>No wishlists yet.</p>
          : wishlists.map((wishlist) => <div className="header-wishlist-preview" key={wishlist.id}>
              <Link href="/account/wishlists">{wishlist.name} · {wishlist.lines.length} saved products</Link>
              <div>{wishlist.lines.slice(0, 3).map((line) => <img key={line.id} src={line.image} alt={line.name} width={56} height={56} />)}</div>
            </div>)}
        <Link href={href}>{status === "unauthenticated" ? "Login / Register" : "Manage wishlists"}</Link>
      </div>
    </HeaderDataMenu>
  );
}
