import { describe, expect, it } from "vitest";
import {
  addDiscountCodeAction,
  discountApplyInput,
  discountRemoveInput,
  removeDiscountCodeAction,
} from "../lib/cart-discount";

describe("cart discount actions", () => {
  it("builds an addDiscountCode action with the entered code", () => {
    expect(addDiscountCodeAction("SAVE10")).toEqual({
      action: "addDiscountCode",
      code: "SAVE10",
    });
  });

  it("builds a removeDiscountCode action with its resource identifier", () => {
    expect(removeDiscountCodeAction("discount-code-id")).toEqual({
      action: "removeDiscountCode",
      discountCode: {
        typeId: "discount-code",
        id: "discount-code-id",
      },
    });
  });
});

describe("cart discount request validation", () => {
  it("trims a non-empty code and accepts both cart modes", () => {
    expect(discountApplyInput.parse({ code: "  SAVE10  ", mode: "b2b" })).toEqual(
      { code: "SAVE10", mode: "b2b" },
    );
  });

  it("rejects empty codes and invalid cart modes", () => {
    expect(discountApplyInput.safeParse({ code: "   ", mode: "b2c" }).success).toBe(
      false,
    );
    expect(discountApplyInput.safeParse({ code: "SAVE10", mode: "other" }).success).toBe(
      false,
    );
  });

  it("requires a discount code resource ID for removal", () => {
    expect(
      discountRemoveInput.safeParse({ discountCodeId: "", mode: "b2c" }).success,
    ).toBe(false);
    expect(
      discountRemoveInput.parse({
        discountCodeId: "discount-code-id",
        mode: "b2c",
      }),
    ).toEqual({ discountCodeId: "discount-code-id", mode: "b2c" });
  });
});
