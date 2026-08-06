import type { CartUpdateAction } from "@commercetools/platform-sdk";
import { z } from "zod";

const cartMode = z.enum(["b2c", "b2b"]);

export const discountApplyInput = z.object({
  code: z.string().trim().min(1),
  mode: cartMode,
});

export const discountRemoveInput = z.object({
  discountCodeId: z.string().trim().min(1),
  mode: cartMode,
});

export function addDiscountCodeAction(code: string): CartUpdateAction {
  return { action: "addDiscountCode", code };
}

export function removeDiscountCodeAction(
  discountCodeId: string,
): CartUpdateAction {
  return {
    action: "removeDiscountCode",
    discountCode: {
      typeId: "discount-code",
      id: discountCodeId,
    },
  };
}
