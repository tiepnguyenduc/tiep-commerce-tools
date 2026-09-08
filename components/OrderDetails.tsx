"use client";

import UIButton from "@/components/commercetools-ui/atoms/button";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { useMiniCart } from "@/components/MiniCart";
import { useToast } from "@/components/Toast";
import type {
  Cart,
  CustomerAddress,
  CustomerOrderDetail,
  StoreMode,
} from "@/lib/types";

const REORDER_MODE: StoreMode = "b2c";

function existingQuantity(
  cart: Cart | null,
  productId: string,
  sku: string,
): number {
  if (!cart || cart.mode !== REORDER_MODE) return 0;
  const line = cart.lines.find((item) =>
    sku ? item.sku === sku : item.productId === productId,
  );
  return line?.quantity ?? 0;
}

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
  const { cart, loadCart, openCart, syncCart } = useMiniCart();
  const showToast = useToast();
  const [reordering, setReordering] = useState(false);

  async function reorder() {
    if (reordering || order.lines.length === 0) return;
    setReordering(true);
    try {
      let currentCart = cart ?? (await loadCart());
      let added = 0;
      for (const line of order.lines) {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: line.productId,
            sku: line.sku,
            quantity:
              existingQuantity(currentCart, line.productId, line.sku) +
              line.quantity,
            mode: REORDER_MODE,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showToast(
            data.error || `Could not add ${line.name} to your cart.`,
            "error",
          );
          continue;
        }
        currentCart = data as Cart;
        added += 1;
      }
      if (currentCart) syncCart(currentCart);
      if (added === 0) {
        showToast("Could not reorder these items.", "error");
        return;
      }
      openCart();
      showToast(
        added === order.lines.length
          ? "Order items added to your cart."
          : "Some order items were added to your cart.",
        added === order.lines.length ? "success" : "info",
      );
    } catch {
      showToast("Network error — could not reorder these items.", "error");
    } finally {
      setReordering(false);
    }
  }

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
        <div className="order-detail-actions">
          <UIButton variant="primary"

            disabled={reordering || order.lines.length === 0}
            onClick={reorder}
            type="button"
          >
            <FontAwesomeIcon aria-hidden="true" icon={faRotateRight} />
            <span>{reordering ? "Reordering…" : "Reorder"}</span>
          </UIButton>
          <UIButton variant="ghost" size="fit" className="text-button" onClick={onClose} type="button">
            Close
          </UIButton>
        </div>
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
