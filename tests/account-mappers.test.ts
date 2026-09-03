import { describe, expect, it } from "vitest";
import {
  mapCustomerOrder,
  mapCustomerOrderDetail,
  mapCustomerProfile,
  mapWishlist,
} from "../lib/ct/account-mappers";

describe("account mappers", () => {
  it("maps customer profile and addresses to storefront-safe data", () => {
    const profile = mapCustomerProfile({
      id: "customer-1",
      email: "tiep@example.com",
      firstName: "Tiep",
      lastName: "Nguyen",
      addresses: [
        {
          id: "address-1",
          country: "US",
          firstName: "Tiep",
          lastName: "Nguyen",
          streetName: "Market",
          streetNumber: "1",
          city: "San Francisco",
          postalCode: "94105",
          phone: "555-0100",
        },
      ],
    } as any);

    expect(profile).toMatchObject({
      id: "customer-1",
      email: "tiep@example.com",
      firstName: "Tiep",
      addresses: [
        {
          id: "address-1",
          streetName: "Market",
          country: "US",
        },
      ],
    });
  });

  it("maps customer order summaries with formatted totals", () => {
    const order = mapCustomerOrder(
      {
        id: "order-1",
        orderNumber: "100000001",
        createdAt: "2026-08-07T00:00:00.000Z",
        orderState: "Open",
        lineItems: [{ quantity: 2 }, { quantity: 1 }],
        totalPrice: {
          type: "centPrecision",
          currencyCode: "USD",
          centAmount: 5400,
          fractionDigits: 2,
        },
      } as any,
      "en-US",
    );

    expect(order).toMatchObject({
      orderNumber: "100000001",
      lineCount: 3,
      total: { centAmount: 5400, formatted: "$54.00" },
    });
  });

  it("maps customer order details with lines, addresses, and totals", () => {
    const order = mapCustomerOrderDetail(
      {
        id: "order-1",
        orderNumber: "100000001",
        createdAt: "2026-08-07T00:00:00.000Z",
        orderState: "Open",
        paymentState: "Paid",
        shipmentState: "Ready",
        lineItems: [
          {
            id: "line-1",
            productId: "product-1",
            name: { "en-US": "Desk Lamp" },
            variant: {
              id: 1,
              sku: "lamp-001",
              images: [{ url: "https://example.com/lamp.png" }],
            },
            price: {
              value: {
                type: "centPrecision",
                currencyCode: "USD",
                centAmount: 2500,
                fractionDigits: 2,
              },
            },
            quantity: 2,
            totalPrice: {
              type: "centPrecision",
              currencyCode: "USD",
              centAmount: 5000,
              fractionDigits: 2,
            },
          },
        ],
        totalPrice: {
          type: "centPrecision",
          currencyCode: "USD",
          centAmount: 5600,
          fractionDigits: 2,
        },
        taxedPrice: {
          totalTax: {
            type: "centPrecision",
            currencyCode: "USD",
            centAmount: 100,
            fractionDigits: 2,
          },
        },
        shippingInfo: {
          shippingMethodName: "Standard",
          price: {
            type: "centPrecision",
            currencyCode: "USD",
            centAmount: 500,
            fractionDigits: 2,
          },
        },
        shippingAddress: {
          firstName: "Tiep",
          lastName: "Nguyen",
          streetNumber: "4075",
          streetName: "Dancing Cloud Ct",
          city: "Destin",
          region: "Florida",
          postalCode: "32541",
          country: "US",
        },
      } as any,
      "en-US",
    );

    expect(order).toMatchObject({
      paymentState: "Paid",
      shipmentState: "Ready",
      shippingMethod: "Standard",
      shippingAddress: { city: "Destin", country: "US" },
      itemsTotal: { formatted: "$50.00" },
      shipping: { formatted: "$5.00" },
      tax: { formatted: "$1.00" },
      total: { formatted: "$56.00" },
      lines: [
        {
          name: "Desk Lamp",
          sku: "lamp-001",
          quantity: 2,
          unitPrice: { formatted: "$25.00" },
          total: { formatted: "$50.00" },
        },
      ],
    });
  });

  it("maps wishlist line items with expanded variant data", () => {
    const wishlist = mapWishlist(
      {
        id: "list-1",
        version: 3,
        name: { "en-US": "My Wishlist" },
        lineItems: [
          {
            id: "wish-line-1",
            productId: "product-1",
            variantId: 1,
            quantity: 1,
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
          },
        ],
      } as any,
      "en-US",
      true,
    );

    expect(wishlist).toMatchObject({
      id: "list-1",
      version: 3,
      isDefault: true,
      lines: [
        {
          id: "wish-line-1",
          productId: "product-1",
          sku: "lamp-001",
          image: "https://example.com/lamp.png",
        },
      ],
    });
  });
});
