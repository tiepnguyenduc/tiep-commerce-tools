"use client";

import Link from "next/link";
import { setCompareCustomer } from "@/lib/compare-storage";
import { resetWishlists, loadWishlists } from "@/lib/wishlist-api";
import { HeaderDataMenu } from "./HeaderDataMenu";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import type { CustomerProfile } from "@/lib/types";

export const customerAuthChangeEvent = "workshop:customer-auth-change";

export function customerDisplayName(customer: CustomerProfile | null) {
  if (!customer) return "Login / Register";

  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email
  );
}

export function publishCustomerAuthChange(customer: CustomerProfile | null) {
  if (typeof window === "undefined") return;

  setCompareCustomer(customer?.id ?? null);
  resetWishlists();
  void loadWishlists().catch(() => undefined);
  window.dispatchEvent(
    new CustomEvent<CustomerProfile | null>(customerAuthChangeEvent, {
      detail: customer,
    }),
  );
}

export function HeaderAccountLink({
  initialCustomer = null,
}: {
  initialCustomer?: CustomerProfile | null;
}) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(
    initialCustomer,
  );

  useEffect(() => {
    const controller = new AbortController();
    let authEventReceived = false;
    const onCustomerChange = (event: Event) => {
      authEventReceived = true;
      setCustomer(
        (event as CustomEvent<CustomerProfile | null>).detail ?? null,
      );
    };

    window.addEventListener(customerAuthChangeEvent, onCustomerChange);

    fetch("/api/customer/me", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { customer?: CustomerProfile };
        return data.customer ?? null;
      })
      .then((nextCustomer) => {
        if (!authEventReceived) publishCustomerAuthChange(nextCustomer);
      })
      .catch((error: unknown) => {
        if (
          !authEventReceived &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setCustomer(null);
        }
      });

    return () => {
      controller.abort();
      window.removeEventListener(customerAuthChangeEvent, onCustomerChange);
    };
  }, []);

  const label = customerDisplayName(customer);

  return (
    <HeaderDataMenu>
      <summary aria-label={customer ? `Account for ${label}` : label} className="header-account-link" title={label}>
        <FontAwesomeIcon aria-hidden="true" icon={faUser} />
        <span>{label}</span>
      </summary>
      <div className="header-data-panel">
        <strong>{customer ? `Hello, ${label}` : "Welcome to WORK/SHOP"}</strong>
        {customer && <p className="muted">{customer.email}</p>}
        <Link href="/account">{customer ? "My account" : "Login / Register"}</Link>
        {customer && <>
          <Link href="/account/orders">My orders</Link>
          <Link href="/account/addresses">My addresses</Link>
          <Link href="/account/wishlists">My wishlists</Link>
        </>}
      </div>
    </HeaderDataMenu>
  );
}
