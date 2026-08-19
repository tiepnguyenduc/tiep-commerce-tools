import type {
  Cart as CtCart,
  CentPrecisionMoney,
  LineItem,
  TypedMoney,
} from "@commercetools/platform-sdk";
import type { Cart, CartLine, Money, StoreMode } from "../types";
import { variantAttributes } from "./catalog-mappers";

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

function localizedSlug(line: Pick<LineItem, "productId" | "productSlug">, locale: string) {
  return (
    line.productSlug?.[locale] ||
    line.productSlug?.en ||
    Object.values(line.productSlug ?? {})[0] ||
    line.productId
  );
}

export function mapCommercetoolsCart(
  cart: Pick<
    CtCart,
    | "id"
    | "version"
    | "lineItems"
    | "totalPrice"
    | "taxedPrice"
    | "discountCodes"
  >,
  mode: StoreMode,
  locale = "en-US",
): Cart {
  const lines: CartLine[] = cart.lineItems.map((line) => {
    const selectedPrice = line.price.discounted?.value ?? line.price.value;
    return {
      id: line.id,
      productId: line.productId,
      slug: localizedSlug(line, locale),
      variantId: line.variant.id,
      variantKey: line.variant.key,
      variantLabel: line.variant.key || line.variant.sku || `Variant ${line.variant.id}`,
      variantAttributes: variantAttributes(line.variant, locale),
      sku: line.variant.sku || line.id,
      name: localizedName(line, locale),
      image: line.variant.images?.[0]?.url || fallbackImage,
      quantity: line.quantity,
      unitPrice: mapMoney(selectedPrice, locale),
      total: mapMoney(line.totalPrice, locale),
    };
  });
  const subtotalCents = cart.lineItems.reduce((sum, line) => {
    const selectedPrice = line.price.discounted?.value ?? line.price.value;
    return sum + selectedPrice.centAmount * line.quantity;
  }, 0);
  const subtotal = mapMoney(
    { ...cart.totalPrice, centAmount: subtotalCents },
    locale,
  );
  const taxTotal = mapMoney(
    cart.taxedPrice?.totalTax ?? { ...cart.totalPrice, centAmount: 0 },
    locale,
  );
  const total = mapMoney(cart.totalPrice, locale);
  const discountTotal = mapMoney(
    {
      ...cart.totalPrice,
      centAmount: Math.max(
        0,
        subtotalCents + taxTotal.centAmount - cart.totalPrice.centAmount,
      ),
    },
    locale,
  );
  const discountCodes = (cart.discountCodes ?? []).flatMap((info) => {
    const code = info.discountCode.obj?.code;
    return code
      ? [
          {
            id: info.discountCode.id,
            code,
            state: info.state,
          },
        ]
      : [];
  });

  return {
    id: cart.id,
    version: cart.version,
    mode,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    taxTotal,
    discountTotal,
    total,
    discountCodes,
  };
}
