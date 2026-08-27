import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderDetails } from "../components/OrderDetails";

describe("order details", () => {
  it("renders items, statuses, address, and totals", () => {
    const html = renderToStaticMarkup(
      <OrderDetails
        onClose={() => {}}
        order={{
          id: "order-1",
          orderNumber: "100000001",
          createdAt: "2026-08-07T00:00:00.000Z",
          orderState: "Open",
          paymentState: "Paid",
          shipmentState: "Ready",
          lineCount: 2,
          lines: [
            {
              id: "line-1",
              productId: "product-1",
              sku: "lamp-001",
              name: "Desk Lamp",
              image: "https://example.com/lamp.png",
              quantity: 2,
              unitPrice: {
                centAmount: 2500,
                currencyCode: "USD",
                formatted: "$25.00",
              },
              total: {
                centAmount: 5000,
                currencyCode: "USD",
                formatted: "$50.00",
              },
            },
          ],
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
          itemsTotal: {
            centAmount: 5000,
            currencyCode: "USD",
            formatted: "$50.00",
          },
          total: {
            centAmount: 5000,
            currencyCode: "USD",
            formatted: "$50.00",
          },
        }}
      />,
    );

    expect(html).toContain("Order #100000001");
    expect(html).toContain("Desk Lamp");
    expect(html).toContain("Paid");
    expect(html).toContain("Destin, Florida, 32541");
    expect(html).toContain("Order total");
    expect(html).toContain("Reorder");
  });
});
