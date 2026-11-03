/**
 * Variant selection shared by the B2C and B2B product pages: attribute-based option
 * groups (color, size, …) and resolving the variant that matches a set of choices.
 */
export type OptionAttribute = { name: string; label?: string; value: string };
export type OptionVariant = { id: number; attributes: OptionAttribute[] };

export type OptionGroup = {
  name: string;
  label: string;
  values: string[];
};

function dedupeValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

/** Attributes that vary between variants and read well as buttons. */
export function optionGroupsFor(variants: OptionVariant[]): OptionGroup[] {
  const attributesByName = new Map<string, OptionAttribute[]>();

  for (const variant of variants) {
    for (const attribute of variant.attributes) {
      const list = attributesByName.get(attribute.name) ?? [];
      list.push(attribute);
      attributesByName.set(attribute.name, list);
    }
  }

  return Array.from(attributesByName.entries())
    .map(([name, attributes]) => ({
      name,
      label: attributes[0]?.label ?? name,
      values: dedupeValues(attributes.map((attribute) => attribute.value)),
    }))
    .filter(
      (group) =>
        group.values.length > 1 &&
        group.values.length <= 12 &&
        group.values.every((value) => value.length <= 36) &&
        !/(code|specification|description|arrival|sku)/i.test(group.label),
    );
}

export function selectedAttributeValue(variant: OptionVariant, name: string) {
  return (
    variant.attributes.find((attribute) => attribute.name === name)?.value ?? ""
  );
}

/**
 * The variant matching every current choice with `name` set to `value`; failing
 * that, any variant offering `value`, so a click always lands somewhere sensible.
 */
export function variantForOption<V extends OptionVariant>(
  variants: V[],
  groups: OptionGroup[],
  current: V,
  name: string,
  value: string,
): V {
  const nextSelections = new Map(
    groups.map((group) => [
      group.name,
      group.name === name ? value : selectedAttributeValue(current, group.name),
    ]),
  );

  return (
    variants.find((variant) =>
      Array.from(nextSelections).every(
        ([attributeName, selectedValue]) =>
          !selectedValue ||
          selectedAttributeValue(variant, attributeName) === selectedValue,
      ),
    ) ??
    variants.find(
      (variant) => selectedAttributeValue(variant, name) === value,
    ) ??
    current
  );
}

export function variantColor(variant: OptionVariant) {
  return (
    variant.attributes.find((attribute) =>
      /color label|search color/i.test(attribute.label ?? ""),
    )?.value ?? ""
  );
}

export function colorValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isColorGroup(group: Pick<OptionGroup, "label">) {
  return /(color|colour)/i.test(group.label);
}
