export type AccountPage =
  "dashboard" | "profile" | "addresses" | "orders" | "wishlist";

export const accountPages: { id: AccountPage; label: string; href: string }[] =
  [
    { id: "dashboard", label: "Account Dashboard", href: "/account" },
    { id: "profile", label: "Profile", href: "/account/profile" },
    { id: "addresses", label: "Addresses", href: "/account/addresses" },
    { id: "orders", label: "My Orders", href: "/account/orders" },
    { id: "wishlist", label: "My Wishlists", href: "/account/wishlists" },
  ];

export function accountHref(page: AccountPage) {
  return accountPages.find((item) => item.id === page)?.href ?? "/account";
}

export function isAccountPage(value: string): value is AccountPage {
  return accountPages.some((page) => page.id === value);
}

export function resolveAccountPage(value: string): AccountPage | null {
  if (value === "wishlists") return "wishlist";
  return isAccountPage(value) ? value : null;
}
