# Plan: real commercetools cart/customer/order/B2B as-associate

## Scope

Implement API-ready real commercetools flows while preserving the current local training fallback when core CTP env vars are missing.

## Architecture

- Keep SDK access server-only under `lib/ct/*`.
- Add shared server session state for active B2C/B2B cart IDs and customer identity. This is intentionally process-local for training; README must state production should replace it with signed HTTP-only persistence.
- Add real cart helpers:
  - B2C: create/get/update cart with versioned update actions; create order from cart.
  - B2B: use `apiRoot.asAssociate().withAssociateIdValue(...).inBusinessUnitKeyWithBusinessUnitKeyValue(...)` for carts/orders.
  - B2B line item actions can apply distribution/supply channels from env.
- Add real customer helpers:
  - customer sign-up
  - customer login with anonymous cart merge
  - minimal customer response mapping
- Update route handlers:
  - `/api/cart` chooses live B2C/B2B cart when env is ready, otherwise training cart.
  - `/api/customer/login` and `/api/customer/register` expose customer/auth learning flows.
  - `/api/order` places B2C/B2B order from active real cart or training result.
  - `/api/checkout/session` uses the active real cart ID when connected.
- Update UI:
  - Account page has login/register forms through BFF endpoints.
  - Checkout panel can launch hosted Checkout or create an order through Cart/Order API.
- Update docs/env examples with required B2B associate vars and limitations.

## Tests

1. Add failing tests for B2B env readiness and cart/order mapping helpers.
2. Implement helpers/routes.
3. Run `npm run typecheck`, `npm test`, and `npm run build`.

## Non-goals

- No Merchant Center resource provisioning.
- No production database/session store.
- No commit/stage without user approval.
