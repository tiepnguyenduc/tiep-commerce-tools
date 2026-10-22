/** Builds and reads the subset of Order predicates the rule editor can show as conditions. */
export type RuleOperator = ">" | ">=" | "<" | "<=" | "=";
export type RuleCondition =
  | { kind: "total"; operator: RuleOperator; amount: string }
  | { kind: "quantity"; operator: RuleOperator; amount: string }
  | { kind: "sku"; value: string }
  | { kind: "country"; value: string };
export type RuleCombinator = "and" | "or";
export type RuleConditions = { combinator: RuleCombinator; conditions: RuleCondition[] };

export const ruleOperators: RuleOperator[] = [">", ">=", "<", "<=", "="];
const quote = (value: string) => JSON.stringify(value.trim());
const operatorPattern = "(>=|<=|>|<|=)";
const stringPattern = '"((?:[^"\\\\]|\\\\.)*)"';
const patterns: { regex: RegExp; read: (match: RegExpMatchArray, fractionDigits: number) => RuleCondition }[] = [
  {
    regex: new RegExp(`^totalPrice\\.centAmount ${operatorPattern} (\\d+)`),
    read: (m, digits) => ({ kind: "total", operator: m[1] as RuleOperator, amount: String(Number(m[2]) / 10 ** digits) }),
  },
  {
    regex: new RegExp(`^lineItemCount\\(1 = 1\\) ${operatorPattern} (\\d+)`),
    read: (m) => ({ kind: "quantity", operator: m[1] as RuleOperator, amount: m[2] }),
  },
  { regex: new RegExp(`^lineItemExists\\(sku = ${stringPattern}\\)`), read: (m) => ({ kind: "sku", value: JSON.parse(`"${m[1]}"`) }) },
  { regex: new RegExp(`^shippingAddress\\.country = ${stringPattern}`), read: (m) => ({ kind: "country", value: JSON.parse(`"${m[1]}"`) }) },
];

export function conditionComplete(condition: RuleCondition) {
  if (condition.kind === "total" || condition.kind === "quantity") {
    const amount = Number(condition.amount);
    return condition.amount.trim() !== "" && Number.isFinite(amount) && amount >= 0 && (condition.kind === "total" || Number.isInteger(amount));
  }
  return condition.value.trim() !== "";
}

export function conditionPredicate(condition: RuleCondition, fractionDigits = 2) {
  switch (condition.kind) {
    case "total":
      return `totalPrice.centAmount ${condition.operator} ${Math.round(Number(condition.amount) * 10 ** fractionDigits)}`;
    case "quantity":
      return `lineItemCount(1 = 1) ${condition.operator} ${Math.round(Number(condition.amount))}`;
    case "sku":
      return `lineItemExists(sku = ${quote(condition.value)})`;
    case "country":
      return `shippingAddress.country = ${quote(condition.value.toUpperCase())}`;
  }
}

export function buildPredicate({ combinator, conditions }: RuleConditions, fractionDigits = 2) {
  return conditions.filter(conditionComplete).map((condition) => conditionPredicate(condition, fractionDigits)).join(` ${combinator} `);
}

/** Returns null for predicates written outside the editor, so they are edited as text instead of rewritten. */
export function parsePredicate(predicate: string, fractionDigits = 2): RuleConditions | null {
  let rest = predicate.trim();
  let combinator: RuleCombinator | undefined;
  const conditions: RuleCondition[] = [];
  while (rest) {
    const pattern = patterns.find(({ regex }) => regex.test(rest));
    const match = pattern && rest.match(pattern.regex);
    if (!pattern || !match) return null;
    conditions.push(pattern.read(match, fractionDigits));
    rest = rest.slice(match[0].length);
    if (!rest) break;
    const joiner = rest.match(/^ (and|or) /);
    if (!joiner || (combinator && combinator !== joiner[1])) return null;
    combinator = joiner[1] as RuleCombinator;
    rest = rest.slice(joiner[0].length);
  }
  return conditions.length ? { combinator: combinator ?? "and", conditions } : null;
}
