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
            productSlug: { "en-US": "desk-lamp" },
            name: { "en-US": "Desk Lamp" },
            variant: {
              id: 1,
              key: "lamp-black",
              sku: "lamp-001",
              attributes: [
                { name: "colorLabel", value: "Black" },
                { name: "searchColor", value: { key: "black", label: "Black" } },
              ],
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
      taxTotal: { centAmount: 0, formatted: "$0.00" },
      discountTotal: { centAmount: 0, formatted: "$0.00" },
      total: { centAmount: 2599, formatted: "$25.99" },
      discountCodes: [],
      lines: [
        {
          id: "line-1",
          productId: "product-1",
          slug: "desk-lamp",
          variantId: 1,
          variantKey: "lamp-black",
          variantLabel: "lamp-black",
          variantAttributes: [
            { name: "colorLabel", label: "Color Label", value: "Black" },
            { name: "searchColor", label: "Search Color", value: "Black" },
          ],
          sku: "lamp-001",
          name: "Desk Lamp",
          image: "https://example.com/lamp.png",
        },
      ],
    });
  });

  it("keeps product discounts in subtotal and maps cart discount details", () => {
    const cart = mapCommercetoolsCart(
      {
        id: "cart-discounted",
        version: 8,
        totalPrice: {
          type: "centPrecision",
          currencyCode: "USD",
          centAmount: 3600,
          fractionDigits: 2,
        },
        discountCodes: [
          {
            discountCode: {
              typeId: "discount-code",
              id: "discount-code-id",
              obj: { id: "discount-code-id", code: "SAVE10" },
            },
            state: "MatchesCart",
          },
        ],
        lineItems: [
          {
            id: "line-discounted",
            productId: "product-1",
            name: { "en-US": "Desk Lamp" },
            variant: { id: 1, sku: "lamp-001", images: [] },
            quantity: 2,
            price: {
              id: "price-1",
              value: {
                type: "centPrecision",
                currencyCode: "USD",
                centAmount: 2500,
                fractionDigits: 2,
              },
              discounted: {
                value: {
                  type: "centPrecision",
                  currencyCode: "USD",
                  centAmount: 2000,
                  fractionDigits: 2,
                },
                discount: { typeId: "product-discount", id: "product-sale" },
              },
            },
            totalPrice: {
              type: "centPrecision",
              currencyCode: "USD",
              centAmount: 3600,
              fractionDigits: 2,
            },
          },
        ],
      } as any,
      "b2c",
      "en-US",
    );

    expect(cart.subtotal.centAmount).toBe(4000);
    expect(cart.discountTotal.centAmount).toBe(400);
    expect(cart.total.centAmount).toBe(3600);
    expect(cart.discountCodes).toEqual([
      { id: "discount-code-id", code: "SAVE10", state: "MatchesCart" },
    ]);
  });

  it("maps taxed cart totals separately from discounts", () => {
    const cart = mapCommercetoolsCart(
      {
        id: "cart-taxed",
        version: 9,
        totalPrice: {
          type: "centPrecision",
          currencyCode: "USD",
          centAmount: 10800,
          fractionDigits: 2,
        },
        taxedPrice: {
          totalNet: {
            type: "centPrecision",
            currencyCode: "USD",
            centAmount: 10000,
            fractionDigits: 2,
          },
          totalGross: {
            type: "centPrecision",
            currencyCode: "USD",
            centAmount: 10800,
            fractionDigits: 2,
          },
          totalTax: {
            type: "centPrecision",
            currencyCode: "USD",
            centAmount: 800,
            fractionDigits: 2,
          },
          taxPortions: [],
        },
        lineItems: [
          {
            id: "line-taxed",
            productId: "product-1",
            name: { "en-US": "Desk Lamp" },
            variant: { id: 1, sku: "lamp-001", images: [] },
            quantity: 4,
            price: {
              id: "price-1",
              value: {
                type: "centPrecision",
                currencyCode: "USD",
                centAmount: 2500,
                fractionDigits: 2,
              },
            },
            totalPrice: {
              type: "centPrecision",
              currencyCode: "USD",
              centAmount: 10000,
              fractionDigits: 2,
            },
          },
        ],
      } as any,
      "b2c",
      "en-US",
    );

    expect(cart.subtotal.centAmount).toBe(10000);
    expect(cart.taxTotal.centAmount).toBe(800);
    expect(cart.discountTotal.centAmount).toBe(0);
    expect(cart.total.centAmount).toBe(10800);
  });
});
