# Cart Discount Code Design

## Goal

Allow shoppers to apply and remove commercetools Discount Codes configured in Merchant Center from the shared cart page. The feature supports both B2C and B2B carts and shows the resulting discount in the order summary.

## Scope

- Add a discount-code form to the cart order summary.
- Apply a code to the active cart with the commercetools `addDiscountCode` update action.
- Show applied codes and allow each code to be removed with `removeDiscountCode`.
- Show subtotal before cart discounts, the total discount, and the final total.
- Support B2C project-level carts and B2B associate/Business Unit carts.
- Surface validation and commercetools errors without discarding the current cart.
- In training mode, explain that Merchant Center discount codes require a configured commercetools connection; do not simulate codes.

Product Discount badges, promotion banners, and Merchant Center discount configuration are outside this change.

## Architecture

The browser continues to access commercetools only through the Next.js BFF. A dedicated `app/api/cart/discount/route.ts` route separates discount mutations from the existing line-item request schema:

- `POST { code, mode }` applies a code.
- `DELETE { discountCodeId, mode }` removes an applied code.

Both operations call server-only helpers in `lib/ct/cart.ts`. B2C uses the existing project-level cart target. B2B uses the existing `asAssociate().withAssociateIdValue(...).inBusinessUnitKeyWithBusinessUnitKeyValue(...)` chain. Cart reads and mutation responses expand `discountCodes[*].discountCode` so the app can map the human-entered code as well as its resource ID. Both paths reuse the current optimistic-concurrency behavior: fetch the latest cart version, submit the action, and retry once after a `409` conflict.

The discount endpoint returns the complete mapped cart after every successful mutation. The client replaces its local cart state with that response, avoiding an extra request and ensuring prices, applied-code state, and cart version stay synchronized.

## Cart Data Model

The application `Cart` type gains:

- `subtotal`: sum of line-item totals before cart-level discount-on-total-price reductions.
- `discountTotal`: a positive money value representing the amount deducted.
- `total`: the final commercetools cart total after discounts.
- `discountCodes`: applied code entries containing the Discount Code resource ID, entered code, and application state.

The mapper reads `cart.discountCodes`, `cart.discountOnTotalPrice`, `cart.lineItems`, and `cart.totalPrice`. It preserves commercetools as the pricing source of truth. The pre-cart-discount subtotal uses each line's selected Product Discount price (`price.discounted.value` when present, otherwise `price.value`) multiplied by quantity. This avoids incorrectly presenting an existing Product Discount as a code discount. The mapper compares that subtotal with the final cart total and exposes the non-negative difference as `discountTotal`, covering both line-item-targeted and total-price-targeted Cart Discounts.

Applied-code state is retained because commercetools can accept a code reference while reporting a state such as `DoesNotMatchCart`. The UI shows only codes returned on the updated cart and presents their state when they are not actively matching.

## User Interface

The order summary contains:

- A labeled text input and Apply button.
- A pending state that disables duplicate submission.
- An inline error message for invalid input, unavailable Merchant Center connectivity, or commercetools rejection.
- A list of applied-code chips, each with a Remove button.
- Summary rows for Subtotal, Discount (only when greater than zero), and Total.

Applying or removing a code updates the existing `CartView` cart state with the returned cart. A failed request leaves the displayed cart unchanged. Editing the input clears the previous apply error. Remove failures are shown without hiding the affected code.

## Validation and Error Handling

- Trim codes before submission and reject empty codes in the BFF.
- Validate `mode` as `b2c` or `b2b`.
- Validate removal identifiers as non-empty strings.
- Return `400` for malformed input and missing active carts.
- Return an actionable response when commercetools is not configured instead of mutating the training cart.
- Preserve commercetools error text when safe and fall back to a stable generic message.
- Return `502` for upstream commercetools failures, matching the existing cart endpoint convention.
- Retry one time on `409 ConcurrentModification` through the shared cart update helper.

## Testing

Implementation follows test-driven development:

1. Mapper tests prove subtotal, discount amount, final total, applied-code IDs/codes, and non-matching states.
2. Cart helper tests prove the correct add/remove actions and one-time `409` retry for both update paths where practical.
3. Route tests prove request validation, training-mode rejection, and B2C/B2B mode forwarding.
4. Component tests, if the current test environment supports React DOM, prove submit/remove pending and error behavior; otherwise these interactions are covered by extracted client mutation functions plus build/type verification.
5. Run the focused tests, full Vitest suite, TypeScript check, and production build.

## Acceptance Criteria

- A Discount Code created and activated in Merchant Center can be applied to an eligible B2C cart.
- The same workflow works for an eligible B2B cart under its configured associate and Business Unit context.
- The applied code, discount amount, and final total appear without reloading the page.
- An applied code can be removed and prices return to the updated commercetools values.
- Invalid, inactive, duplicate, or non-matching codes produce a visible message and do not corrupt local cart state.
- Quantity changes continue to work after applying or removing a code.
- No commercetools credentials or SDK client code enter the browser bundle.
