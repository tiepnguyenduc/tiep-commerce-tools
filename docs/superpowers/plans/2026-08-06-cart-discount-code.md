# Cart Discount Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Merchant Center-backed Discount Code apply/remove behavior and discounted totals to the shared B2C/B2B cart page.

**Architecture:** Extend the app cart boundary with discount totals and expanded Discount Code data, add server-only cart mutations behind a dedicated Next.js Route Handler, and update the existing client cart state from each mutation response. Reuse the existing B2C/B2B cart targets and one-retry optimistic concurrency path.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, commercetools Platform SDK 8, Zod 4, Vitest 3.

## Global Constraints

- All commercetools calls remain server-only behind the BFF.
- Both B2C and B2B carts are supported; B2B writes use the existing associate and Business Unit chain.
- Training mode does not simulate Merchant Center discount codes.
- Discount mutations retry once on `409 ConcurrentModification`.
- No implementation commit is created without explicit user approval.

---

### Task 1: Cart discount data boundary

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/cart-engine.ts`
- Modify: `lib/ct/mappers.ts`
- Modify: `tests/ct-mappers.test.ts`
- Modify: `tests/cart-checkout.test.ts`

**Interfaces:**
- Produces: `Cart.discountCodes`, `Cart.discountTotal`, and `Cart.total`.
- Produces: `AppliedDiscountCode = { id: string; code: string; state: string }`.
- Consumes later: Cart API responses and `CartView` render these fields.

- [ ] **Step 1: Write failing mapper tests** using complete cart fixtures with `discountCodes[*].discountCode.obj`, Product Discount prices, line-item Cart Discounts, and final `totalPrice`; assert literal subtotal, discount total, total, code, ID, and state values.
- [ ] **Step 2: Run `npm test -- tests/ct-mappers.test.ts tests/cart-checkout.test.ts`** and confirm failure because the new cart fields do not exist.
- [ ] **Step 3: Add the minimal shared types and mapper logic.** Calculate pre-cart-discount subtotal from `line.price.discounted?.value ?? line.price.value`, multiply by quantity, map final `totalPrice`, and derive a non-negative discount difference. Map only expanded Discount Code objects with their reference ID and state.
- [ ] **Step 4: Update the training cart constructors** so `discountCodes` is empty, `discountTotal` is zero, and `total` equals `subtotal`.
- [ ] **Step 5: Re-run the focused tests** and confirm they pass.

### Task 2: Server-side cart discount mutations

**Files:**
- Create: `lib/cart-discount.ts`
- Create: `tests/cart-discount.test.ts`
- Modify: `lib/ct/cart.ts`

**Interfaces:**
- Produces: `addDiscountCodeAction(code: string): CartUpdateAction`.
- Produces: `removeDiscountCodeAction(discountCodeId: string): CartUpdateAction`.
- Produces: `applyLiveDiscountCode(mode: StoreMode, code: string): Promise<Cart>`.
- Produces: `removeLiveDiscountCode(mode: StoreMode, discountCodeId: string): Promise<Cart>`.
- Consumes: existing cart session, B2C/B2B target selection, mapper, and `withRetry` behavior.

- [ ] **Step 1: Write failing pure action-builder tests** asserting the exact SDK payloads `{ action: "addDiscountCode", code }` and `{ action: "removeDiscountCode", discountCode: { typeId: "discount-code", id } }`.
- [ ] **Step 2: Run `npm test -- tests/cart-discount.test.ts`** and confirm failure because the builders are missing.
- [ ] **Step 3: Implement the minimal action builders** in the SDK-independent cart-discount module.
- [ ] **Step 4: Run the focused test** and confirm it passes.
- [ ] **Step 5: Extend the server cart target** so reads and writes request `expand: "discountCodes[*].discountCode"`, including the retry response.
- [ ] **Step 6: Add apply/remove live helpers** that require an active cart, call `withRetry` with one action, and map the returned cart for the requested mode.
- [ ] **Step 7: Run mapper and action tests plus `npm run typecheck`** and fix only contract/type errors.

### Task 3: Discount BFF endpoint and validation

**Files:**
- Modify: `lib/cart-discount.ts`
- Create: `app/api/cart/discount/route.ts`
- Modify: `tests/cart-discount.test.ts`

**Interfaces:**
- Produces: `discountApplyInput` accepting `{ code: string, mode: "b2c" | "b2b" }` and trimming a non-empty code.
- Produces: `discountRemoveInput` accepting `{ discountCodeId: string, mode: "b2c" | "b2b" }`.
- Produces: `POST /api/cart/discount` and `DELETE /api/cart/discount` returning a mapped `Cart` or `{ error: string }`.

- [ ] **Step 1: Write failing validation tests** for trimmed codes, empty codes, invalid modes, and empty removal IDs.
- [ ] **Step 2: Run `npm test -- tests/cart-discount.test.ts`** and confirm the new schema assertions fail.
- [ ] **Step 3: Implement the Zod schemas** and keep them outside the server-only module so they can be tested without importing the commercetools client.
- [ ] **Step 4: Run validation tests** and confirm they pass.
- [ ] **Step 5: Implement the Route Handler.** Return `400` for malformed input, absent live configuration, absent active cart, or missing B2B context; call the matching live helper; return `502` with the upstream message fallback for commercetools failures.
- [ ] **Step 6: Run `npm run typecheck`** and verify the route compiles under Next.js 16.

### Task 4: Cart discount form and summary

**Files:**
- Modify: `components/CartView.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `POST/DELETE /api/cart/discount` and the extended `Cart` response.
- Produces: apply form, applied-code chips, remove buttons, inline pending/error state, and Subtotal/Discount/Total summary rows.

- [ ] **Step 1: Add client mutation helpers inside `CartView`** that parse `{ error }` on failure and replace cart state only on a successful complete-cart response.
- [ ] **Step 2: Render the labeled form** with controlled code input, submit pending state, trimmed submission, and error clearing on edit.
- [ ] **Step 3: Render applied-code chips and removal behavior** with per-code pending state; retain the code and show the error if removal fails.
- [ ] **Step 4: Render Subtotal, conditional negative Discount, and final Total** using mapped money fields.
- [ ] **Step 5: Add focused styles** for the form, chips, disabled controls, and accessible inline error without changing unrelated pages.
- [ ] **Step 6: Run `npm run typecheck` and `npm run build`** to validate the client/server boundary and production compilation.

### Task 5: Full verification

**Files:**
- Verify only; fix files above if a failure identifies a defect.

**Interfaces:**
- Confirms all prior task contracts work together.

- [ ] **Step 1: Run `npm test`** and require the full Vitest suite to pass.
- [ ] **Step 2: Run `npm run typecheck`** and require zero TypeScript errors.
- [ ] **Step 3: Run `npm run build`** and require a successful Next.js production build.
- [ ] **Step 4: Run `git diff --check` and inspect `git diff`** for whitespace errors, accidental scope expansion, secrets, and missing files.
- [ ] **Step 5: Report changed files and verification evidence** without staging or committing implementation changes.
