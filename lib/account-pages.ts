export type AccountPage = "dashboard" | "profile" | "addresses" | "orders" | "wishlist";

export const accountPages: { id: AccountPage; label: string; href: string }[] = [
  { id: "dashboard", label: "Account Dashboard", href: "/account" },
  { id: "profile", label: "Profile", href: "/account/profile" },
  { id: "addresses", label: "Addresses", href: "/account/addresses" },
  { id: "orders", label: "My Orders", href: "/account/orders" },
  { id: "wishlist", label: "My Wishlist", href: "/account/wishlist" },
];

export function accountHref(page: AccountPage) {
  return accountPages.find((item) => item.id === page)?.href ?? "/account";
}

export function isAccountPage(value: string): value is AccountPage {
  return accountPages.some((page) => page.id === value);
}
