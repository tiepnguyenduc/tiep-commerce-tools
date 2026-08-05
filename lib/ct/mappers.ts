import type {
  Cart as CtCart,
  CentPrecisionMoney,
  LineItem,
  TypedMoney,
} from "@commercetools/platform-sdk";
import type { Cart, CartLine, Money, StoreMode } from "../types";

const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23f3f0ea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23847b6d' font-family='Arial' font-size='28'%3EProduct image%3C/text%3E%3C/svg%3E";

function asCentPrecision(value: TypedMoney): CentPrecisionMoney {
  if (value.type !== "centPrecision") {
    return {
      type: "centPrecision",
      currencyCode: value.currencyCode,
      centAmount: Math.round(value.centAmount),
      fractionDigits: value.fractionDigits,
    };
  }
  return value;
}

export function mapMoney(value: TypedMoney, locale = "en-US"): Money {
  const money = asCentPrecision(value);
  return {
    centAmount: money.centAmount,
    currencyCode: money.currencyCode,
    formatted: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: money.currencyCode,
    }).format(money.centAmount / 10 ** money.fractionDigits),
  };
}

function localizedName(line: Pick<LineItem, "name">, locale: string) {
  return line.name[locale] || line.name.en || Object.values(line.name)[0] || "";
}

export function mapCommercetoolsCart(
  cart: Pick<CtCart, "id" | "version" | "lineItems" | "totalPrice">,
  mode: StoreMode,
  locale = "en-US",
): Cart {
  const lines: CartLine[] = cart.lineItems.map((line) => ({
    id: line.id,
    productId: line.productId,
    sku: line.variant.sku || line.id,
    name: localizedName(line, locale),
    image: line.variant.images?.[0]?.url || fallbackImage,
    quantity: line.quantity,
    unitPrice: mapMoney(line.price.value, locale),
    total: mapMoney(line.totalPrice, locale),
  }));

  return {
    id: cart.id,
    version: cart.version,
    mode,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: mapMoney(cart.totalPrice, locale),
  };
}
