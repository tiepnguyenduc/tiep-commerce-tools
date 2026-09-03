"use client";

import Link from "next/link";
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
        if (!authEventReceived) setCustomer(nextCustomer);
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
    <Link
      aria-label={customer ? `Account for ${label}` : label}
      className="header-account-link"
      href="/account"
      title={label}
    >
      <FontAwesomeIcon aria-hidden="true" icon={faUser} />
      <span>{label}</span>
    </Link>
  );
}
