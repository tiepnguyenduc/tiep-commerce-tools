# Launchpad UI source

Vendored from the local commercetools B2C Launchpad clone at
`scaffold-b2c/frontend`, commit `75d43f550faed360f51646a33338900f2367ff3d`.
The upstream frontend package declares the MIT license.

Imported components: Button (including feedback/loading layers), Input,
Skeleton, QuantitySelector, and Hero; their helper functions and default
Tailwind theme/configuration are copied from the same revision.

Integration changes:
- Local import paths and explicit Next.js client boundaries.
- Input IDs use React useId with an explicit id override.
- Quantity controls have accessible names, button types, disabled handling,
  and a live output.
- Hero uses next/image and next/link with app URLs instead of Studio references.
  Its CTA is a styled link, avoiding a button nested in a link.
- Tailwind utilities are scoped to #launchpad-storefront, with preflight disabled
  to coexist with the current storefront CSS.

The existing BFF supplies products, carts, accounts and checkout. This does not
configure Frontend Studio or replace the application with the full scaffold.

## Homepage banners and header

`molecules/banner` adapts the scaffold's banner content/image/CTA interface into
a reusable component with `sm`, `md`, and `lg` sizes, light/dark tones, an explicit
heading level, and an image-error fallback. `components/Home.tsx` configures three
banners; only the main banner uses h1 and high-priority image loading. Secondary
campaigns use distinct images from the existing catalog response.

`components/Header.tsx` adapts the scaffold header's logo/search/utility row and
separate navigation row to the existing BFF-backed slots. `HeaderMobileMenu` uses
a native modal dialog for focus containment and Escape handling. Search keeps
its existing suggestions and adds an inline display mode. Scoped CSS modules
keep these layout changes separate from legacy storefront styles.
