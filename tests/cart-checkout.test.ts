import { describe, expect, it } from "vitest";
import { clearCart, emptyCart, updateCart } from "../lib/cart-engine";
describe("local cart and checkout training behavior", () => {
  it("adds, updates and removes a line deterministically", () => {
    let cart = updateCart(emptyCart(), "p1", 2);
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotal.centAmount).toBe(97800);
    expect(cart.lines[0].slug).toBe("aero-task-chair");
    cart = updateCart(cart, "p1", 1);
    expect(cart.lines[0].quantity).toBe(1);
    cart = updateCart(cart, "p1", 0);
    expect(cart.lines).toHaveLength(0);
  });
  it("keeps the selected checkout mode", () =>
    expect(updateCart(emptyCart("b2b"), "p2", 1).mode).toBe("b2b"));
  it("initializes cart discount totals without simulating a code", () => {
    const cart = emptyCart();
    expect(cart.discountCodes).toEqual([]);
    expect(cart.taxTotal.centAmount).toBe(0);
    expect(cart.discountTotal.centAmount).toBe(0);
    expect(cart.total).toEqual(cart.subtotal);
  });
  it("clears all lines and resets summary values", () => {
    const cart = clearCart(updateCart(emptyCart("b2b"), "p1", 2));
    expect(cart.mode).toBe("b2b");
    expect(cart.lines).toEqual([]);
    expect(cart.itemCount).toBe(0);
    expect(cart.subtotal.centAmount).toBe(0);
    expect(cart.taxTotal.centAmount).toBe(0);
    expect(cart.discountTotal.centAmount).toBe(0);
    expect(cart.total.centAmount).toBe(0);
  });
});
