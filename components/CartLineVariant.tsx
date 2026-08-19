import type { CartLine, ProductSpecification } from "@/lib/types";

const preferredAttributes = /(color|colour|finish|size|material|fabric|wood)/i;
const hiddenAttributes = /(code|specification|description|arrival|sku)/i;

function variantAttributes(line: CartLine) {
  const seen = new Set<string>();
  const attributes = (line.variantAttributes ?? []).filter((attribute) => {
    const key = `${attribute.label}:${attribute.value}`;
    if (!attribute.value || seen.has(key) || hiddenAttributes.test(attribute.label)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return [
    ...attributes.filter((attribute) => preferredAttributes.test(attribute.label)),
    ...attributes.filter((attribute) => !preferredAttributes.test(attribute.label)),
  ].slice(0, 3);
}

function variantTitle(line: CartLine) {
  if (line.variantKey && line.variantKey !== line.sku) return line.variantKey;
  if (line.variantLabel && line.variantLabel !== line.sku) return line.variantLabel;
  if (line.variantId !== undefined) return `Variant ${line.variantId}`;
  return "";
}

function AttributePill({ attribute }: { attribute: ProductSpecification }) {
  return (
    <span>
      {attribute.label}: <strong>{attribute.value}</strong>
    </span>
  );
}

export function CartLineVariant({ line }: { line: CartLine }) {
  const title = variantTitle(line);
  const attributes = variantAttributes(line);

  if (!title && attributes.length === 0) return null;

  return (
    <div className="cart-line-variant">
      {title ? (
        <span>
          Variant: <strong>{title}</strong>
        </span>
      ) : null}
      {attributes.map((attribute) => (
        <AttributePill
          attribute={attribute}
          key={`${attribute.label}-${attribute.value}`}
        />
      ))}
    </div>
  );
}
