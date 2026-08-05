import { describe, expect, it } from "vitest";
import { mapCommercetoolsCart } from "../lib/ct/mappers";

describe("commercetools cart mapping", () => {
  it("maps SDK cart money and line items to storefront-safe types", () => {
    const cart = mapCommercetoolsCart(
      {
        id: "cart-1",
        version: 7,
        totalPrice: {
          type: "centPrecision",
          currencyCode: "USD",
          centAmount: 2599,
          fractionDigits: 2,
        },
        lineItems: [
          {
            id: "line-1",
            productId: "product-1",
            name: { "en-US": "Desk Lamp" },
            variant: {
              id: 1,
              sku: "lamp-001",
              images: [
                {
                  url: "https://example.com/lamp.png",
                  dimensions: { w: 800, h: 600 },
                },
              ],
            },
            quantity: 1,
            price: {
              id: "price-1",
              value: {
                type: "centPrecision",
                currencyCode: "USD",
                centAmount: 2599,
                fractionDigits: 2,
              },
            },
            totalPrice: {
              type: "centPrecision",
              currencyCode: "USD",
              centAmount: 2599,
              fractionDigits: 2,
            },
          },
        ],
      } as any,
      "b2c",
      "en-US",
    );

    expect(cart).toMatchObject({
      id: "cart-1",
      version: 7,
      mode: "b2c",
      itemCount: 1,
      subtotal: { centAmount: 2599, formatted: "$25.99" },
      lines: [
        {
          id: "line-1",
          productId: "product-1",
          sku: "lamp-001",
          name: "Desk Lamp",
          image: "https://example.com/lamp.png",
        },
      ],
    });
  });
});
