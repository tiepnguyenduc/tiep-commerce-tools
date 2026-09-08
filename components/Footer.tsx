"use client";
import UIButton from "@/components/commercetools-ui/atoms/button";
import LibraryFooter, { type FooterColumn } from "@/components/commercetools-ui/organisms/footer";
import UIInput from "@/components/commercetools-ui/atoms/input";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faPalette,
  faSwatchbook,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/Toast";

const footerColumns: FooterColumn[] = [
  {
    "header": "Shop",
    "links": [
      {
        "name": "All products",
        "reference": {
          "type": "link",
          "link": "/products"
        }
      },
      {
        "name": "Workspace",
        "reference": {
          "type": "link",
          "link": "/products?category=Workspace"
        }
      },
      {
        "name": "Lighting",
        "reference": {
          "type": "link",
          "link": "/products?category=Lighting"
        }
      },
      {
        "name": "Storage",
        "reference": {
          "type": "link",
          "link": "/products?category=Storage"
        }
      }
    ]
  },
  {
    "header": "Account",
    "links": [
      {
        "name": "Dashboard",
        "reference": {
          "type": "link",
          "link": "/account"
        }
      },
      {
        "name": "Orders",
        "reference": {
          "type": "link",
          "link": "/account/orders"
        }
      },
      {
        "name": "Wishlists",
        "reference": {
          "type": "link",
          "link": "/account/wishlists"
        }
      },
      {
        "name": "Cart",
        "reference": {
          "type": "link",
          "link": "/cart"
        }
      }
    ]
  },
  {
    "header": "Support",
    "links": [
      {
        "name": "Shipping",
        "reference": {
          "type": "link",
          "link": "/products"
        }
      },
      {
        "name": "Returns",
        "reference": {
          "type": "link",
          "link": "/products"
        }
      },
      {
        "name": "Care guides",
        "reference": {
          "type": "link",
          "link": "/products"
        }
      },
      {
        "name": "Contact",
        "reference": {
          "type": "link",
          "link": "/products"
        }
      }
    ]
  },
  {
    "header": "Business",
    "links": [
      {
        "name": "B2B buying",
        "reference": {
          "type": "link",
          "link": "/b2b"
        }
      },
      {
        "name": "Trade checkout",
        "reference": {
          "type": "link",
          "link": "/checkout/b2b"
        }
      },
      {
        "name": "Consumer store",
        "reference": {
          "type": "link",
          "link": "/b2c"
        }
      },
      {
        "name": "Project accounts",
        "reference": {
          "type": "link",
          "link": "/account"
        }
      }
    ]
  }
];

export function Footer() {
  const showToast = useToast();

  function submitNewsletter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Thanks for signing up.", "success");
  }

  return (
    <div className="footer">
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
              <UIInput
                autoComplete="email"
                id="footer-email"
                placeholder="Email address"
                required
                type="email"
              />
              <UIButton variant="ghost" size="fit" type="submit">Sign up</UIButton>
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

        <div className="launchpad-ui">
          <LibraryFooter columns={footerColumns} />
        </div>

        <div className="footer-bottom">
          <span>WORK/SHOP training storefront</span>
          <span>Next.js BFF · commercetools-ready · deterministic mock mode</span>
        </div>
      </div>
    </div>
  );
}
