"use client";

import type { CustomerAddress, CustomerOrderDetail } from "@/lib/types";

function addressLines(address: CustomerAddress) {
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    [address.streetNumber, address.streetName].filter(Boolean).join(" "),
    [address.city, address.region, address.postalCode].filter(Boolean).join(", "),
    address.country,
    address.phone,
  ].filter(Boolean);
}

function OrderAddress({
  address,
  title,
}: {
  address?: CustomerAddress;
  title: string;
}) {
  if (!address) return null;
  return (
    <section className="order-address">
      <h4>{title}</h4>
      <address>
        {addressLines(address).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
    </section>
  );
}

export function OrderDetails({
  onClose,
  order,
}: {
  onClose: () => void;
  order: CustomerOrderDetail;
}) {
  return (
    <section
      aria-labelledby={`order-detail-${order.id}`}
      className="order-detail-panel"
      id={`order-details-${order.id}`}
    >
      <header className="order-detail-head">
        <div>
          <span className="eyebrow">Order details</span>
          <h3 id={`order-detail-${order.id}`}>Order #{order.orderNumber}</h3>
          <p className="muted">
            Placed {new Date(order.createdAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <button className="text-button" onClick={onClose} type="button">
          Close
        </button>
      </header>

      <dl className="order-status-grid">
        <div>
          <dt>Order status</dt>
          <dd>{order.orderState}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{order.paymentState || "Pending"}</dd>
        </div>
        <div>
          <dt>Shipment</dt>
          <dd>{order.shipmentState || "Pending"}</dd>
        </div>
        {order.shippingMethod && (
          <div>
            <dt>Shipping method</dt>
            <dd>{order.shippingMethod}</dd>
          </div>
        )}
      </dl>

      <div className="order-line-list">
        {order.lines.map((line) => (
          <article className="order-line" key={line.id}>
            <img alt={line.name} src={line.image} />
            <div className="order-line-copy">
              <strong>{line.name}</strong>
              <span>SKU: {line.sku}</span>
              <span>Quantity: {line.quantity}</span>
            </div>
            <div className="order-line-price">
              <span>{line.unitPrice.formatted} each</span>
              <strong>{line.total.formatted}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="order-detail-bottom">
        <div className="order-address-grid">
          <OrderAddress address={order.shippingAddress} title="Shipping address" />
          <OrderAddress address={order.billingAddress} title="Billing address" />
        </div>
        <dl className="order-total-list">
          <div>
            <dt>Items</dt>
            <dd>{order.itemsTotal.formatted}</dd>
          </div>
          {order.shipping && (
            <div>
              <dt>Shipping</dt>
              <dd>{order.shipping.formatted}</dd>
            </div>
          )}
          {order.tax && (
            <div>
              <dt>Tax</dt>
              <dd>{order.tax.formatted}</dd>
            </div>
          )}
          <div className="order-total-final">
            <dt>Order total</dt>
            <dd>{order.total.formatted}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
