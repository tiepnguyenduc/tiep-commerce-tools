# WORK/SHOP — commercetools training storefront

A runnable Next.js 16 App Router storefront that demonstrates a shared catalog across polished B2C and B2B journeys. It is intentionally useful with no credentials: deterministic products, cart state, checkout results, and account data keep every training path available.

## Run locally

```bash
npm install
cp .env.example .env.local # optional; leave values blank for training mode
npm run dev
```

Open `http://localhost:3000`. Useful routes: `/b2c`, `/b2b`, `/products`, `/cart`, `/checkout/b2c`, `/checkout/b2b`, `/account`, and `/api/health`.

Verification commands:

```bash
npm run typecheck
npm test
npm run build
```

## Architecture and safety boundary

The browser only uses this app's `/api/*` BFF routes. All commercetools SDK imports live in server-only modules under `lib/ct/*`, each protected by `import 'server-only'`. UI components consume mapped types from `lib/types.ts`; no platform SDK response type crosses the boundary. `CTP_CLIENT_SECRET`, OAuth credentials, and scopes are server-only and have no `NEXT_PUBLIC_` equivalent.

Catalog pages are server components that call `lib/ct/catalog.ts`. Client-mutated cart and Checkout state call Route Handlers. The included training store is process-local and deliberately resets when the dev server restarts; replace it with actual cart helpers and an HTTP-only server session for production.

## commercetools initial setup

1. Create an API Client in Merchant Center with least-privilege scopes for product search, carts/orders, customer/account operations, and `manage_sessions:{projectKey}` for Checkout.
2. Copy `.env.example` to `.env.local` and set the project, client, auth/API region URLs, and scopes. Never expose the secret in client-prefixed variables.
3. Model products with localized names/slugs, variants/SKUs, prices in USD/US, images, and searchable attributes. Configure Stores, channels, product selections, Business Units, associate roles, and approval rules for B2B.
4. Call `/api/health` to see whether the app selected `connected` or `training` mode.

## Product Search API mapping

`lib/ct/catalog.ts` uses `apiRoot.products().search()` (the Product Search API, not deprecated Product Projections Search), maps projections into the small app `Product` type, and falls back to sample data on missing configuration or an unavailable training project. `/products` demonstrates full-text query and category facet URL state. A production implementation should derive facets from Product Search facet results, add locale/store/channel projection parameters, and cache only public catalog reads—not user data.

## Product reviews

The PDP displays product reviews (newest first, five per page) and a public review form with a 1–5 star rating, display name, title, and review text. Guests can submit reviews; the author name is self-reported and reviews are not marked as verified purchases. The API validates lengths and ratings and maps only public review fields back to the browser.

`GET /api/products/{productId}/reviews?offset=0` reads published reviews. `POST /api/products/{productId}/reviews` creates a commercetools Review targeting the published Product. Reviews excluded from rating statistics are omitted from the public list. Reviews are published immediately by this storefront; no approval state is assigned.

The API client needs `view_products:{projectKey}` to read and `manage_products:{projectKey}` to create reviews (see the [commercetools Reviews API](https://docs.commercetools.com/api/projects/reviews)). In training mode, reviews are held in process memory per sample product, survive page reloads, and reset when the server restarts. Connected API errors are shown as retryable errors rather than falling back to demo reviews.

## B2C cart, customer and order mapping

The cart supports add, remove, and quantity changes through `/api/cart`. When the core `CTP_*` env vars are present it creates/updates a real commercetools Cart through `lib/ct/cart.ts`; when env is missing it falls back to the deterministic local training cart.

Implemented live B2C endpoints:

- `POST /api/cart` — creates a real active Cart on demand and applies versioned `addLineItem`, `changeLineItemQuantity`, or `removeLineItem` actions.
- `GET /api/cart` — reads the active real cart from process-local session.
- `POST /api/customer/register` — creates a Customer and merges the active anonymous cart when available.
- `POST /api/customer/login` — logs in a Customer and merges the active anonymous cart with `MergeWithExistingCustomerCart`.
- `POST /api/order` — creates an Order from the active real cart, then clears the active cart ID.

For a production implementation, replace the process-local session in `lib/ct/session.ts` with signed HTTP-only cookies or a server session store. The current implementation is intentionally local-dev training state.

## B2B as-associate mapping

### Business storefront

The dedicated `/b2b` portal now provides account registration/sign-in, company creation, authorized associate assignment, Business Unit/Store selection, store-scoped product prices, product details, and an independent business cart. `/b2b/account`, `/b2b/products`, and `/b2b/cart` share this authenticated business context. Its encrypted HTTP-only cookie session is separate from the legacy B2C process-local session. Business operations validate membership and Store assignments on the server.

See [B2B setup and verification](docs/B2B.md) for required merchant configuration and limitations. Preview the merchant setup without changing the project:

```bash
node --env-file=.env.local scripts/setup-b2b.mjs
```

Only after reviewing the target project and resource plan, add `--apply` to create the named roles, Stores, and distribution channels. This does not create prices, customers, or Business Units. Channel prices and Store assignments must be configured before business purchasing is available. The portal places orders through its own checkout at `/b2b/checkout` (not the legacy `/checkout/b2b` flow).

### Business checkout and orders

`/b2b/checkout` shows the business bag, the company's delivery addresses and a required purchase order number. `POST /api/b2b/orders` sets the chosen address as shipping and billing address, applies the default shipping method that matches the cart (when the API client may read shipping methods), and creates the Order with `asAssociate().inBusinessUnitKeyWithBusinessUnitKeyValue(...).orders().post(...)`, including `purchaseOrderNumber` and a generated `B2B-YYYYMMDD-XXXXXX` order number. The request carries the cart version the buyer reviewed; a changed bag is rejected with 409. When the order matches an active Approval Rule, commercetools opens an Approval Flow, and the confirmation page `/b2b/orders/[id]` shows the pending state with a link to it. The associate role needs `CreateMyOrdersFromMyCarts` to place orders and `ViewMyOrders` to read the confirmation.

### Legacy training checkout

The legacy `/checkout/b2b` training journey demonstrates a PO number and the approval-pending path using environment-configured context. It is separate from the new authenticated portal. Its live B2B cart/order mutations use this SDK chain:

```ts
apiRoot
  .asAssociate()
  .withAssociateIdValue({ associateId })
  .inBusinessUnitKeyWithBusinessUnitKeyValue({ businessUnitKey });
```

The server session must atomically hold `businessUnitKey`, `storeKey`, distribution/supply channel IDs, and product-selection ID. Carts are created in that Business Unit and Store. commercetools creates an Approval Flow automatically when an active Approval Rule matches an order; the storefront does not create one. Approve/reject actions must read the latest flow version immediately before writing.

Required B2B env vars for live B2B routes:

```bash
CTP_B2B_ASSOCIATE_ID=customer-id-of-associate
CTP_B2B_BUSINESS_UNIT_KEY=your-business-unit-key
```

Optional B2B env vars:

```bash
CTP_B2B_STORE_KEY=your-store-key
CTP_B2B_DISTRIBUTION_CHANNEL_KEY=your-product-distribution-channel-key
CTP_B2B_SUPPLY_CHANNEL_KEY=your-inventory-supply-channel-key
```

Your API Client scopes must allow cart/order/customer operations and B2B associate flows for the project. A broad training scope such as `manage_project:{projectKey}` works for learning, but production should use least-privilege scopes.

## Checkout Browser SDK mapping

`/api/checkout/session` is the credentialed boundary. With complete env plus `CTP_CHECKOUT_APP_KEY`, it obtains an OAuth token server-side and creates a short-lived session using the cart reference. The browser receives only `sessionId`, `projectKey`, and derived `region`, then `CheckoutDemo` initializes `checkoutFlow` for the full hosted address, shipping, payment, and order completion experience.

Configure a Checkout Application and PSP Connector (Stripe, Adyen, Mollie, etc.) in Merchant Center, including the exact payment return URL. Sessions should be created only when checkout starts. With missing config, the BFF returns a deterministic local confirmation or approval-pending result.

Important: hosted Checkout now uses the active real cart ID when the app is connected. If the app is in training mode, `/api/checkout/session` returns a deterministic training result because Checkout Sessions require a real active cart in the configured project.

## Frontend Studio vs the AI plugin

Frontend Studio is a hosted composition and content-management product used by teams to assemble and operate storefront experiences. The commercetools AI plugin used to build this repository is developer guidance: it supplies architecture patterns and API-accurate implementation context to the coding agent. It does not deploy Frontend Studio, create Merchant Center resources, configure a PSP, or replace the runtime commercetools APIs.

## Training notes

- The app never requires external images or credentials to compile; image URLs are rendered unoptimized and may show browser placeholders if offline.
- Sample state is intentionally deterministic and single-process. It is not a multi-user production session store.
- A real B2B implementation additionally needs customer authentication, associate authorization, Business Unit/store context, and permission-gated endpoints.

## Launchpad frontend components

The complete 322-file commercetools UI library is available in
`components/commercetools-ui`, with its supporting modules in `lib/launchpad`.
The root layout installs `LaunchpadUIProvider` for translations and supporting styles.
The storefront now imports Button, Input, QuantitySelector, Skeleton, campaign
banners, ProductTile and Footer directly from this library. Header search/actions,
account forms, cart and wishlist controls use the shared primitives. The existing
BFF supplies product data and handles account, cart and checkout operations.

Edit homepage campaigns in `components/Home.tsx`. Compatibility exports remain in
`components/launchpad-adapters`. See `components/commercetools-ui/README.md` for
examples, source revision and configuration requirements of additional components.

Run `node scripts/verify-launchpad-ui.mjs` to verify source completeness and
production local imports. The normal typecheck includes production library code;
upstream Storybook/Jest examples are retained separately from the app's tests.

### Header data

Navigation uses the demo catalog category hierarchy from the BFF, including nested
categories on desktop and mobile. Account and wishlist disclosures use the current
customer session; wishlist previews show saved list names, counts and images.
The mini cart reloads when opened and when authentication changes, with loading,
error and retry states. Wishlist requests from a previous session cannot overwrite
the current session after a reset.
