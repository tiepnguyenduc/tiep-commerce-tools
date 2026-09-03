"use client";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faPalette,
  faSwatchbook,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/Toast";

export function Footer() {
  const showToast = useToast();

  function submitNewsletter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Thanks for signing up.", "success");
  }

  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <section className="footer-newsletter" aria-label="Newsletter signup">
          <div>
            <Link className="brand footer-brand" href="/">
              WORK<i>/</i>SHOP
            </Link>
            <p>
              Furniture, lighting, and storage for focused rooms and modern
              teams.
            </p>
          </div>
          <form className="footer-signup" onSubmit={submitNewsletter}>
            <label htmlFor="footer-email">Join our trade notes</label>
            <div>
              <input
                autoComplete="email"
                id="footer-email"
                placeholder="Email address"
                required
                type="email"
              />
              <button type="submit">Sign up</button>
            </div>
          </form>
        </section>

        <section className="footer-service-row" aria-label="Store services">
          <div>
            <FontAwesomeIcon
              aria-hidden="true"
              className="footer-service-icon"
              icon={faPalette}
            />
            <strong>Free design consults</strong>
            <span>Room planning for home and office projects.</span>
          </div>
          <div>
            <FontAwesomeIcon
              aria-hidden="true"
              className="footer-service-icon"
              icon={faBriefcase}
            />
            <strong>Trade-ready checkout</strong>
            <span>B2C and B2B purchasing paths in one storefront.</span>
          </div>
          <div>
            <FontAwesomeIcon
              aria-hidden="true"
              className="footer-service-icon"
              icon={faSwatchbook}
            />
            <strong>Fast sample support</strong>
            <span>Material and finish guidance before you order.</span>
          </div>
        </section>

        <nav className="footer-links" aria-label="Footer navigation">
          <div>
            <h3>Shop</h3>
            <Link href="/products">All products</Link>
            <Link href="/products?category=Workspace">Workspace</Link>
            <Link href="/products?category=Lighting">Lighting</Link>
            <Link href="/products?category=Storage">Storage</Link>
          </div>
          <div>
            <h3>Account</h3>
            <Link href="/account">Dashboard</Link>
            <Link href="/account/orders">Orders</Link>
            <Link href="/account/wishlists">Wishlists</Link>
            <Link href="/cart">Cart</Link>
          </div>
          <div>
            <h3>Support</h3>
            <Link href="/products">Shipping</Link>
            <Link href="/products">Returns</Link>
            <Link href="/products">Care guides</Link>
            <Link href="/products">Contact</Link>
          </div>
          <div>
            <h3>Business</h3>
            <Link href="/b2b">B2B buying</Link>
            <Link href="/checkout/b2b">Trade checkout</Link>
            <Link href="/b2c">Consumer store</Link>
            <Link href="/account">Project accounts</Link>
          </div>
        </nav>

        <div className="footer-bottom">
          <span>WORK/SHOP training storefront</span>
          <span>Next.js BFF · commercetools-ready · deterministic mock mode</span>
        </div>
      </div>
    </footer>
  );
}
