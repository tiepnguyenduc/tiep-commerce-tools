# commercetools Launchpad UI

All **322 upstream files** (atoms, molecules, organisms, stories and specs) were
copied from the sibling `scaffold-b2c/frontend/components/commercetools-ui` clone,
revision `75d43f550faed360f51646a33338900f2367ff3d`. The upstream frontend package
declares the MIT license. `source-manifest.json` lists every original file.

## Use in this app

Import individual components; there is deliberately no eager barrel importing
Studio, Algolia and payment integrations into every page.

```tsx
"use client";

import LaunchpadUIProvider from "@/components/LaunchpadUIProvider";
import Button from "@/components/commercetools-ui/atoms/button";
import Input from "@/components/commercetools-ui/atoms/input";

export default function Example() {
  return (
    <LaunchpadUIProvider>
      <Input name="email" label="Email" type="email" />
      <Button type="button" variant="primary">Continue</Button>
    </LaunchpadUIProvider>
  );
}
```

The root layout loads the theme, Tailwind utilities and `LaunchpadUIProvider` with
`resetStyles={false}`. Descendants already receive translations and supporting
slider/modal styles. Use a `launchpad-ui` wrapper around original library sections
that need scoped base styles, or a nested provider with its default reset enabled. Its default locale is `en`; pass
`locale` and matching `messages` to use another supported locale (German messages
are in `lib/launchpad/messages/de.json`). The provider does not initialize SDKs,
perform account requests, or alter the app's existing BFF session.

## Directory map

- `atoms/`: button, input, checkbox, radio, drawer, image, link, search, slider,
  quantity selector and other primitives.
- `molecules/`: banner, product tile, cart/wishlist item, breadcrumbs, and other
  composed UI elements.
- `organisms/`: header, footer, product lists/details, account, cart, checkout,
  order displays, content blocks and other full sections.
- `lib/launchpad/`: transitive helpers, types, contexts, providers, SDK modules,
  translations and supporting styles.
- `components/launchpad-adapters/`: compatibility exports for older imports.
  Storefront pages import the canonical library directly.

## Active storefront integration

Buttons, inputs, quantity selectors and skeletons are shared across the header,
account, catalog, cart and wishlist screens. `molecules/banner/campaign.tsx` is the
app campaign variant; the original Studio banner API remains at `molecules/banner`.
The root Footer uses the library Footer navigation and responsive accordions.

`lib/mappers/launchpad-product.ts` maps BFF listing data to ProductTile, preserving
SKU, currency, regular price and discounted price. ProductTile accepts an explicit
`href` and `imageSuffix={false}` for existing catalog image URLs. Quick view loads
lazily and is disabled here alongside Studio wishlist controls; app wishlist and
compare actions continue to use the existing BFF. Unknown stock is not labeled
out of stock. Inputs retain native props, unique label IDs and optional wrapper
classes; quantity buttons have accessible names and do not submit enclosing forms.

## Configuration-dependent components

This is the complete component source library, not a migration to Frontend Studio.
Presentation components can be composed with app data and callbacks. Components
that call Launchpad hooks still need their corresponding service configuration:

- Studio hooks and Account/Frontastic providers use the copied SDK and
  `NEXT_PUBLIC_FRONTASTIC_HOST`; they are not automatic replacements for this
  app's `/api/*` BFF. Map data/callbacks or configure Studio before mounting them.
- Algolia components require the application ID, public search-only key, indexes,
  and their InstantSearch/LocalizedIndex providers.
- Hosted Checkout components require a real project/session and Checkout setup.
- Market controls require project country/language settings and a configured
  locale-switching flow; this app retains unprefixed routes.
- Cloudinary media IDs require the Cloudinary configuration; normal images use
  the app's existing unoptimized image setup.

Do not put commercetools client secrets in public environment variables. Import
provider contexts only for the feature that requires them.

## Compatibility changes

Local imports point to app aliases and `lib/launchpad`, and interactive TSX files
have explicit client boundaries. Locale reads use the intl provider instead of
assuming an `[locale]` route exists. Library links use unprefixed navigation;
`usePath` handles both prefixed and unprefixed paths. Checkout's old `showTaxes`
option maps to the installed SDK's `tax.display`. The Algolia input event handler
is narrowed to input targets. Analytics/preview declarations remain local to the
library; upstream overrides of Next.js navigation types are not installed.

Dependencies are installed in the root package/lockfile, with compatible security
patches applied. Tailwind scans the entire library and adapters. Runtime assets
are copied to `public`; generated Storybook output, node_modules, credentials,
and scaffold application routes were not copied.

Stories/specs are retained as upstream examples and excluded from the app's
TypeScript/test run, just as stories are excluded by the scaffold. A Storybook or
Jest workspace and its supporting mocks are needed to run those source examples.
Production component code remains included in the app's TypeScript checks.

## Verify

```sh
node scripts/verify-launchpad-ui.mjs
npm run typecheck
npm test
npm run build
```
