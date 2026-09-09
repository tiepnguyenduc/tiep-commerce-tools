"use client";
import UIButton from "@/components/commercetools-ui/atoms/button";
import LibraryFooter, { type FooterColumn } from "@/components/commercetools-ui/organisms/footer";
import UIInput from "@/components/commercetools-ui/atoms/input";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faPalette, faSwatchbook } from "@fortawesome/free-solid-svg-icons";
import styles from "./Footer.module.css";
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
    <footer className={styles.footer} aria-label="WORK/SHOP footer">
      <div className={styles.inner}>
        <section className={styles.newsletter} aria-label="Newsletter signup">
          <div className={styles.identity}>
            <Link className={styles.wordmark} href="/" aria-label="WORK/SHOP home">
              WORK<span>/</span>SHOP
            </Link>
            <p>Considered spaces.<br />Better everyday living.</p>
          </div>
          <form className={styles.signup} onSubmit={submitNewsletter}>
            <label htmlFor="footer-email">A little inspiration, delivered.</label>
            <p>New collections, thoughtful spaces, and notes from the studio.</p>
            <div className={styles.signupRow}>
              <UIInput
                containerClassName={styles.emailField}
                autoComplete="email"
                id="footer-email"
                name="email"
                placeholder="Your email address"
                required
                type="email"
              />
              <UIButton className={styles.signupButton} variant="ghost" size="fit" type="submit">Sign up <span aria-hidden="true">↗</span></UIButton>
            </div>
          </form>
        </section>

        <section className={styles.services} aria-label="Store services">
          <div>
            <FontAwesomeIcon aria-hidden="true" icon={faPalette} />
            <div><strong>Free design consults</strong><span>A fresh perspective for your space.</span></div>
          </div>
          <div>
            <FontAwesomeIcon aria-hidden="true" icon={faBriefcase} />
            <div><strong>Made for home & work</strong><span>Thoughtful pieces for every project.</span></div>
          </div>
          <div>
            <FontAwesomeIcon aria-hidden="true" icon={faSwatchbook} />
            <div><strong>Help with the details</strong><span>Materials, finishes, and expert guidance.</span></div>
          </div>
        </section>

        <div className={`launchpad-ui ${styles.navigation}`}>
          <LibraryFooter columns={footerColumns} as="nav" showBottom={false} />
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} WORK/SHOP</span>
          <span>Powered by <strong>commercetools</strong></span>
        </div>
      </div>
    </footer>
  );
}
