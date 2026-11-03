"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  ArrowLeftIcon,
  CodeBracketIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type {
  ApprovalRuleStatus,
  ApprovalRuleTier,
  ApprovalRuleView,
  ApprovalRuleWorkspace,
} from "@/lib/b2b/approval-types";
import {
  buildPredicate,
  parsePredicate,
  ruleOperators,
  type RuleCombinator,
  type RuleCondition,
  type RuleOperator,
} from "@/lib/b2b/approval-rule-predicate";
import { countryDisplayName } from "@/lib/storefront-countries";
import { useToast } from "@/components/Toast";
import { B2BAccountWorkspace } from "./B2BAccountWorkspace";
import { load } from "./B2BApprovalFlows";
import { useB2B } from "./B2BProvider";
import { useB2BTranslations } from "./useB2BTranslations";
import f from "./B2BApprovalFlows.module.css";
import s from "./B2BApprovalRules.module.css";

const listPath = "/b2b/account/approval-rules";
type Role = { key: string; name: string };
type Translate = ReturnType<typeof useB2BTranslations>["t"];
const operatorLabels: Record<RuleOperator, string> = {
  ">": "is more than",
  ">=": "is at least",
  "<": "is less than",
  "<=": "is at most",
  "=": "is exactly",
};
const conditionKinds: { kind: RuleCondition["kind"]; label: string }[] = [
  { kind: "total", label: "Order total" },
  { kind: "quantity", label: "Total quantity" },
  { kind: "sku", label: "Order contains SKU" },
  { kind: "country", label: "Shipping country" },
];

const fractionDigits = (currency: string) => {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
};
const formatAmount = (amount: string, currency: string, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
};

export function ruleHref(
  path: "add" | { id: string },
  businessUnitKey: string,
) {
  const query = businessUnitKey
    ? `?businessUnitKey=${encodeURIComponent(businessUnitKey)}`
    : "";
  return path === "add"
    ? `${listPath}/add${query}`
    : `${listPath}/${encodeURIComponent(path.id)}/edit${query}`;
}

export function describeCondition(
  condition: RuleCondition,
  t: Translate,
  currency: string,
  locale: string,
) {
  const kind =
    conditionKinds.find((item) => item.kind === condition.kind)?.label ?? "";
  if (condition.kind === "total")
    return `${t(kind)} ${t(operatorLabels[condition.operator])} ${formatAmount(condition.amount, currency, locale)}`;
  if (condition.kind === "quantity")
    return `${t(kind)} ${t(operatorLabels[condition.operator])} ${condition.amount}`;
  if (condition.kind === "sku") return `${t(kind)} ${condition.value}`;
  return `${t("Ships to")} ${countryDisplayName(condition.value.toUpperCase())}`;
}

const roleName = (roles: Role[], key: string) =>
  roles.find((role) => role.key === key)?.name ?? key;

function RuleStatusBadge({ status }: { status: ApprovalRuleStatus }) {
  const { t } = useB2BTranslations();
  return (
    <span
      className={`${f.badge} ${status === "Active" ? f.badgeApproved : s.badgeInactive}`}
    >
      <span className={s.statusDot} aria-hidden="true" />
      {t(status)}
    </span>
  );
}

/* ───────────────────────── List ───────────────────────── */

export function B2BApprovalRulesPage({
  businessUnitKey,
}: {
  businessUnitKey?: string;
}) {
  return (
    <B2BAccountWorkspace
      title="Approval rules"
      description="Decide which orders need sign-off, who places them and who approves them, tier by tier."
    >
      <ApprovalRuleList initialUnit={businessUnitKey ?? ""} />
    </B2BAccountWorkspace>
  );
}

type StatusFilter = "all" | ApprovalRuleStatus;

export function ApprovalRuleList({ initialUnit }: { initialUnit: string }) {
  const { t, locale } = useB2BTranslations();
  const { state } = useB2B();
  const router = useRouter();
  const customerId = state?.customer?.id;
  const [unitKey, setUnitKey] = useState(initialUnit);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const { data, error, isLoading, mutate } = useSWR<ApprovalRuleWorkspace>(
    customerId ? [listPath, customerId, unitKey] : null,
    ([, , key]: [string, string, string]) =>
      load(
        `/api/b2b/approval-rules${key ? `?businessUnitKey=${encodeURIComponent(key)}` : ""}`,
      ),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      keepPreviousData: true,
    },
  );
  const selectedUnit = unitKey || data?.businessUnitKey || "";
  const rules = useMemo(() => data?.rules ?? [], [data]);
  const query = search.trim().toLowerCase();
  const visible = rules.filter(
    (rule) =>
      (filter === "all" || rule.status === filter) &&
      (!query ||
        `${rule.name} ${rule.description}`.toLowerCase().includes(query)),
  );

  if (error && !data)
    return (
      <div className={`${f.approvals} ${s.rules}`}>
        <div className={f.state} role="alert">
          <XCircleIcon aria-hidden="true" />
          <h2>{t("Approval rules could not be loaded.")}</h2>
          <p>{error.message}</p>
          <button
            className={f.secondary}
            type="button"
            onClick={() => void mutate()}
          >
            {t("Try again")}
          </button>
        </div>
      </div>
    );

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All rules" },
    { id: "Active", label: "Active" },
    { id: "Inactive", label: "Inactive" },
  ];
  return (
    <div className={`${f.approvals} ${s.rules}`}>
      <div className={f.toolbar}>
        <label className={f.field}>
          {t("Business unit")}
          <select
            value={selectedUnit}
            disabled={!data?.units.length}
            onChange={(event) => {
              setUnitKey(event.target.value);
              router.replace(
                `${listPath}?businessUnitKey=${encodeURIComponent(event.target.value)}`,
                { scroll: false },
              );
            }}
          >
            {!data?.units.length && (
              <option value="">
                {isLoading ? t("Loading…") : t("No business units")}
              </option>
            )}
            {data?.units.map((unit) => (
              <option key={unit.key} value={unit.key}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        {data?.canCreate && (
          <Link className={s.primaryLink} href={ruleHref("add", selectedUnit)}>
            <PlusIcon aria-hidden="true" />
            {t("Add approval rule")}
          </Link>
        )}
      </div>

      <div className={s.listFilters}>
        <div
          className={s.segmented}
          role="tablist"
          aria-label={t("Rule status")}
        >
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {t(item.label)}
              <span>
                {item.id === "all"
                  ? rules.length
                  : rules.filter((rule) => rule.status === item.id).length}
              </span>
            </button>
          ))}
        </div>
        <label className={f.search}>
          <span className="sr-only">{t("Search rules")}</span>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search by rule name…")}
          />
        </label>
      </div>

      {isLoading ? (
        <div className={f.detailSkeleton} role="status">
          <span className="sr-only">{t("Loading approval rules…")}</span>
          <span />
          <span />
        </div>
      ) : !visible.length ? (
        <div className={f.state}>
          <ShieldCheckIcon aria-hidden="true" />
          <h2>
            {rules.length
              ? t("No rules match your filters")
              : t("No approval rules yet")}
          </h2>
          <p>
            {rules.length
              ? t("Try another status or search term.")
              : t(
                  "Create a rule to require sign-off for large or sensitive orders.",
                )}
          </p>
          {!rules.length && data?.canCreate && (
            <Link
              className={s.primaryLink}
              href={ruleHref("add", selectedUnit)}
            >
              <PlusIcon aria-hidden="true" />
              {t("Add approval rule")}
            </Link>
          )}
        </div>
      ) : (
        <ul className={s.ruleList}>
          {visible.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              roles={data?.roles ?? []}
              currency={data?.currency ?? "USD"}
              locale={locale}
              editHref={
                data?.canUpdate ? ruleHref({ id: rule.id }, selectedUnit) : ""
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RuleCard({
  rule,
  roles,
  currency,
  locale,
  editHref,
}: {
  rule: ApprovalRuleView;
  roles: Role[];
  currency: string;
  locale: string;
  editHref: string;
}) {
  const { t } = useB2BTranslations();
  const parsed = parsePredicate(rule.predicate, fractionDigits(currency));
  return (
    <li
      className={`${s.ruleCard} ${rule.status === "Inactive" ? s.ruleInactive : ""}`}
    >
      <div className={s.ruleHead}>
        <div>
          <RuleStatusBadge status={rule.status} />
          <h3>{rule.name}</h3>
          {rule.description && <p>{rule.description}</p>}
        </div>
        {editHref && (
          <Link
            className={s.editLink}
            href={editHref}
            aria-label={`${t("Edit")} ${rule.name}`}
          >
            <PencilSquareIcon aria-hidden="true" />
            {t("Edit")}
          </Link>
        )}
      </div>
      <dl className={s.ruleFacts}>
        <div>
          <dt>
            <FunnelIcon aria-hidden="true" />
            {t("Applies when")}
          </dt>
          <dd>
            {parsed ? (
              parsed.conditions.map((condition, index) => (
                <span className={s.factGroup} key={index}>
                  {index > 0 && (
                    <em className={s.joiner}>
                      {t(parsed.combinator === "and" ? "and" : "or")}
                    </em>
                  )}
                  <span className={s.chip}>
                    {describeCondition(condition, t, currency, locale)}
                  </span>
                </span>
              ))
            ) : (
              <code className={s.code}>{rule.predicate}</code>
            )}
          </dd>
        </div>
        <div>
          <dt>
            <UserGroupIcon aria-hidden="true" />
            {t("Requested by")}
          </dt>
          <dd>
            {rule.requesters.map((key) => (
              <span className={s.chip} key={key}>
                {roleName(roles, key)}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>
            <ShieldCheckIcon aria-hidden="true" />
            {t("Approvers")}
          </dt>
          <dd className={s.tierSummary}>
            {rule.tiers.map((tier, index) => (
              <span className={s.factGroup} key={index}>
                {index > 0 && (
                  <span className={s.arrow} aria-hidden="true">
                    →
                  </span>
                )}
                <span className={s.tierPill}>
                  <b>{t("Tier {count}", { count: index + 1 })}</b>
                  {tier.and
                    .map((group) =>
                      group.or
                        .map((key) => roleName(roles, key))
                        .join(` ${t("or")} `),
                    )
                    .join(` + `)}
                </span>
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </li>
  );
}

/* ───────────────────────── Editor ───────────────────────── */

type Draft = {
  name: string;
  description: string;
  status: ApprovalRuleStatus;
  requesters: string[];
  advanced: boolean;
  combinator: RuleCombinator;
  conditions: RuleCondition[];
  predicate: string;
  tiers: ApprovalRuleTier[];
};

const emptyCondition = (
  kind: RuleCondition["kind"] = "total",
): RuleCondition =>
  kind === "total" || kind === "quantity"
    ? { kind, operator: ">", amount: "" }
    : { kind, value: "" };

export function draftFromRule(
  rule: ApprovalRuleView | undefined,
  currency: string,
): Draft {
  const parsed = rule
    ? parsePredicate(rule.predicate, fractionDigits(currency))
    : null;
  return {
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    status: rule?.status ?? "Active",
    requesters: rule?.requesters ?? [],
    advanced: Boolean(rule && !parsed),
    combinator: parsed?.combinator ?? "and",
    conditions: parsed?.conditions ?? [emptyCondition()],
    predicate: rule?.predicate ?? "",
    tiers: rule?.tiers.length ? rule.tiers : [{ and: [{ or: [] }] }],
  };
}

export function draftErrors(draft: Draft, predicate: string) {
  const errors: Partial<
    Record<"name" | "requesters" | "conditions" | "approvers", string>
  > = {};
  if (!draft.name.trim()) errors.name = "Rule name is required.";
  if (!draft.requesters.length)
    errors.requesters = "Select at least one requester role.";
  if (!predicate.trim())
    errors.conditions = draft.advanced
      ? "Enter a predicate."
      : "Complete at least one condition.";
  else if (
    !draft.advanced &&
    draft.conditions.some(
      (condition) =>
        !buildPredicate({ combinator: "and", conditions: [condition] }),
    )
  )
    errors.conditions = "Complete or remove the empty conditions.";
  if (draft.tiers.some((tier) => tier.and.some((group) => !group.or.length)))
    errors.approvers = "Pick at least one role for every approval.";
  return errors;
}

export function B2BApprovalRuleEditorPage({
  id,
  businessUnitKey,
}: {
  id?: string;
  businessUnitKey?: string;
}) {
  return (
    <B2BAccountWorkspace
      title={id ? "Edit approval rule" : "Add approval rule"}
    >
      <ApprovalRuleEditorLoader
        id={id}
        businessUnitKey={businessUnitKey ?? ""}
      />
    </B2BAccountWorkspace>
  );
}

function ApprovalRuleEditorLoader({
  id,
  businessUnitKey,
}: {
  id?: string;
  businessUnitKey: string;
}) {
  const { t } = useB2BTranslations();
  const { state } = useB2B();
  const customerId = state?.customer?.id;
  const query = businessUnitKey
    ? `?businessUnitKey=${encodeURIComponent(businessUnitKey)}`
    : "";
  const url = id
    ? `/api/b2b/approval-rules/${encodeURIComponent(id)}${query}`
    : `/api/b2b/approval-rules${query}`;
  const { data, error, isLoading, mutate } = useSWR<
    | ApprovalRuleWorkspace
    | (Omit<ApprovalRuleWorkspace, "rules" | "units" | "canCreate"> & {
        rule: ApprovalRuleView;
        businessUnitName: string;
      })
  >(
    customerId ? [url, customerId] : null,
    ([path]: [string, string]) => load(path),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const unit = data?.businessUnitKey || businessUnitKey;
  const back = `${listPath}${unit ? `?businessUnitKey=${encodeURIComponent(unit)}` : ""}`;
  const backLink = (
    <Link href={back} className={f.backLink}>
      <ArrowLeftIcon aria-hidden="true" />
      {t("Back to approval rules")}
    </Link>
  );
  if (isLoading || (!data && !error))
    return (
      <div className={`${f.approvals} ${s.rules}`}>
        {backLink}
        <div className={f.detailSkeleton} role="status">
          <span className="sr-only">{t("Loading approval rule…")}</span>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  if (error || !data)
    return (
      <div className={`${f.approvals} ${s.rules}`}>
        {backLink}
        <div className={f.state} role="alert">
          <XCircleIcon aria-hidden="true" />
          <h2>{t("This approval rule could not be loaded.")}</h2>
          <p>{error?.message}</p>
          <button
            className={f.secondary}
            type="button"
            onClick={() => void mutate()}
          >
            {t("Try again")}
          </button>
        </div>
      </div>
    );
  const rule = "rule" in data ? data.rule : undefined;
  const allowed = rule ? data.canUpdate : "canCreate" in data && data.canCreate;
  const unitName =
    "businessUnitName" in data
      ? data.businessUnitName
      : (data.units.find((item) => item.key === data.businessUnitKey)?.name ??
        "");
  return (
    <div className={`${f.approvals} ${s.rules}`}>
      {backLink}
      {!allowed && (
        <p className={s.notice} role="status">
          <ShieldCheckIcon aria-hidden="true" />
          {t(
            rule
              ? "Your role can view this rule but not change it."
              : "Your role cannot create approval rules for this business unit.",
          )}
        </p>
      )}
      <ApprovalRuleForm
        key={rule ? `${rule.id}-${rule.version}` : "new"}
        rule={rule}
        roles={data.roles}
        currency={data.currency}
        businessUnitKey={data.businessUnitKey}
        businessUnitName={unitName}
        readOnly={!allowed}
        back={back}
      />
    </div>
  );
}

function Section({
  title,
  hint,
  error,
  children,
  aside,
}: {
  title: string;
  hint: string;
  error?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const { t } = useB2BTranslations();
  return (
    <section
      className={`${f.card} ${s.section} ${error ? s.sectionError : ""}`}
    >
      <header className={s.sectionHead}>
        <div>
          <h3>{t(title)}</h3>
          <p>{t(hint)}</p>
        </div>
        {aside}
      </header>
      {children}
      {error && (
        <p className={s.fieldError} role="alert">
          {t(error)}
        </p>
      )}
    </section>
  );
}

function RolePicker({
  roles,
  selected,
  onChange,
  disabled,
  label,
}: {
  roles: Role[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className={s.rolePicker} role="group" aria-label={label}>
      {roles.map((role) => {
        const on = selected.includes(role.key);
        return (
          <button
            key={role.key}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() =>
              onChange(
                on
                  ? selected.filter((key) => key !== role.key)
                  : [...selected, role.key],
              )
            }
          >
            {role.name}
          </button>
        );
      })}
    </div>
  );
}

function ApprovalRuleForm({
  rule,
  roles,
  currency,
  businessUnitKey,
  businessUnitName,
  readOnly,
  back,
}: {
  rule?: ApprovalRuleView;
  roles: Role[];
  currency: string;
  businessUnitKey: string;
  businessUnitName: string;
  readOnly: boolean;
  back: string;
}) {
  const { t, locale } = useB2BTranslations();
  const router = useRouter();
  const showToast = useToast();
  const { mutate } = useSWRConfig();
  const digits = fractionDigits(currency);
  const [draft, setDraft] = useState<Draft>(() =>
    draftFromRule(rule, currency),
  );
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [advancedNote, setAdvancedNote] = useState("");
  const predicate = draft.advanced
    ? draft.predicate.trim()
    : buildPredicate(
        { combinator: draft.combinator, conditions: draft.conditions },
        digits,
      );
  const errors = draftErrors(draft, predicate);
  const shown = submitted ? errors : {};
  const update = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const setCondition = (index: number, next: RuleCondition) =>
    update({
      conditions: draft.conditions.map((condition, i) =>
        i === index ? next : condition,
      ),
    });
  const setTiers = (tiers: ApprovalRuleTier[]) => update({ tiers });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (readOnly || busy || Object.keys(errors).length) return;
    setBusy(true);
    try {
      const response = await fetch(
        rule
          ? `/api/b2b/approval-rules/${encodeURIComponent(rule.id)}`
          : "/api/b2b/approval-rules",
        {
          method: rule ? "PUT" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessUnitKey,
            ...(rule ? { version: rule.version } : {}),
            name: draft.name,
            description: draft.description,
            status: draft.status,
            predicate,
            requesters: draft.requesters,
            tiers: draft.tiers,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "The approval rule could not be saved.",
        );
      await mutate(
        (key) =>
          Array.isArray(key) &&
          typeof key[0] === "string" &&
          (key[0] === listPath || key[0].startsWith("/api/b2b/approval-rules")),
      );
      showToast(
        t(rule ? "Approval rule updated." : "Approval rule created."),
        "success",
      );
      router.push(back);
    } catch (problem) {
      showToast(
        problem instanceof Error
          ? problem.message
          : t("The approval rule could not be saved."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleAdvanced() {
    if (!draft.advanced) {
      update({ advanced: true, predicate });
      setAdvancedNote("");
      return;
    }
    const parsed = parsePredicate(draft.predicate, digits);
    if (!parsed && draft.predicate.trim()) {
      setAdvancedNote(
        "This predicate uses expressions the condition builder cannot show. Keep editing it as text.",
      );
      return;
    }
    update({
      advanced: false,
      ...(parsed ?? {
        combinator: "and" as const,
        conditions: [emptyCondition()],
      }),
    });
  }

  const summaryConditions = draft.advanced
    ? null
    : draft.conditions.filter((condition) =>
        buildPredicate({ combinator: "and", conditions: [condition] }),
      );
  return (
    <form className={s.editor} onSubmit={onSubmit} noValidate>
      <fieldset className={s.main} disabled={readOnly}>
        <Section
          title="Rule details"
          hint="Give the rule a name your team will recognise in approval flows."
          error={shown.name}
        >
          <div className={s.detailsGrid}>
            <label className={s.input}>
              <span>{t("Rule name")} *</span>
              <input
                value={draft.name}
                maxLength={200}
                onChange={(event) => update({ name: event.target.value })}
                placeholder={t("e.g. Orders above $50,000")}
                aria-invalid={Boolean(shown.name)}
              />
            </label>
            <label className={s.input}>
              <span>{t("Description")}</span>
              <textarea
                value={draft.description}
                maxLength={500}
                rows={2}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
                placeholder={t("Optional context for approvers")}
              />
            </label>
          </div>
          <div className={s.statusRow}>
            <button
              type="button"
              role="switch"
              aria-checked={draft.status === "Active"}
              className={s.switch}
              onClick={() =>
                update({
                  status: draft.status === "Active" ? "Inactive" : "Active",
                })
              }
            >
              <span aria-hidden="true" />
            </button>
            <div>
              <strong>
                {t(
                  draft.status === "Active"
                    ? "Rule is active"
                    : "Rule is inactive",
                )}
              </strong>
              <small>
                {t(
                  draft.status === "Active"
                    ? "New orders that match will need approval."
                    : "The rule is saved but no orders will be held for approval.",
                )}
              </small>
            </div>
          </div>
        </Section>

        <Section
          title="Requester roles"
          hint="The rule only applies to orders placed by associates holding one of these roles."
          error={shown.requesters}
        >
          <RolePicker
            roles={roles}
            selected={draft.requesters}
            onChange={(requesters) => update({ requesters })}
            label={t("Requester roles")}
          />
        </Section>

        <Section
          title="Conditions"
          hint="Define which orders trigger this approval rule."
          error={shown.conditions}
          aside={
            <button type="button" className={s.ghost} onClick={toggleAdvanced}>
              <CodeBracketIcon aria-hidden="true" />
              {t(
                draft.advanced ? "Use condition builder" : "Edit as predicate",
              )}
            </button>
          }
        >
          {draft.advanced ? (
            <label className={s.input}>
              <span>{t("Order predicate")}</span>
              <textarea
                className={s.codeInput}
                rows={4}
                value={draft.predicate}
                spellCheck={false}
                onChange={(event) => {
                  update({ predicate: event.target.value });
                  setAdvancedNote("");
                }}
                placeholder='totalPrice.centAmount > 5000000 and lineItemExists(sku = "WL-950")'
              />
              {advancedNote && (
                <small className={s.fieldError}>{t(advancedNote)}</small>
              )}
            </label>
          ) : (
            <>
              {draft.conditions.length > 1 && (
                <div className={s.combinator}>
                  <span>{t("Match")}</span>
                  <div className={s.segmented}>
                    {(["and", "or"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={draft.combinator === value}
                        onClick={() => update({ combinator: value })}
                      >
                        {t(
                          value === "and" ? "All conditions" : "Any condition",
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ol className={s.conditions}>
                {draft.conditions.map((condition, index) => (
                  <li key={index}>
                    {index > 0 && (
                      <em className={s.joiner}>
                        {t(draft.combinator === "and" ? "and" : "or")}
                      </em>
                    )}
                    <div className={s.conditionRow}>
                      <select
                        aria-label={t("Condition")}
                        value={condition.kind}
                        onChange={(event) =>
                          setCondition(
                            index,
                            emptyCondition(
                              event.target.value as RuleCondition["kind"],
                            ),
                          )
                        }
                      >
                        {conditionKinds.map((item) => (
                          <option key={item.kind} value={item.kind}>
                            {t(item.label)}
                          </option>
                        ))}
                      </select>
                      {condition.kind === "total" ||
                      condition.kind === "quantity" ? (
                        <>
                          <select
                            aria-label={t("Operator")}
                            value={condition.operator}
                            onChange={(event) =>
                              setCondition(index, {
                                ...condition,
                                operator: event.target.value as RuleOperator,
                              })
                            }
                          >
                            {ruleOperators.map((operator) => (
                              <option key={operator} value={operator}>
                                {t(operatorLabels[operator])}
                              </option>
                            ))}
                          </select>
                          <span className={s.amount}>
                            {condition.kind === "total" && <b>{currency}</b>}
                            <input
                              aria-label={t(
                                condition.kind === "total"
                                  ? "Amount"
                                  : "Quantity",
                              )}
                              inputMode={
                                condition.kind === "total"
                                  ? "decimal"
                                  : "numeric"
                              }
                              type="number"
                              min={0}
                              step={
                                condition.kind === "total"
                                  ? 1 / 10 ** digits
                                  : 1
                              }
                              value={condition.amount}
                              onChange={(event) =>
                                setCondition(index, {
                                  ...condition,
                                  amount: event.target.value,
                                })
                              }
                              placeholder={
                                condition.kind === "total" ? "2000" : "10"
                              }
                            />
                          </span>
                        </>
                      ) : (
                        <input
                          className={s.textValue}
                          aria-label={t(
                            condition.kind === "sku" ? "SKU" : "Country code",
                          )}
                          value={condition.value}
                          maxLength={condition.kind === "country" ? 2 : 120}
                          onChange={(event) =>
                            setCondition(index, {
                              ...condition,
                              value: event.target.value,
                            })
                          }
                          placeholder={
                            condition.kind === "sku" ? "WL-950GC" : "US"
                          }
                        />
                      )}
                      <button
                        type="button"
                        className={s.iconRemove}
                        disabled={draft.conditions.length === 1}
                        aria-label={t("Remove condition")}
                        onClick={() =>
                          update({
                            conditions: draft.conditions.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                      >
                        <TrashIcon aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className={s.addButton}
                onClick={() =>
                  update({
                    conditions: [...draft.conditions, emptyCondition()],
                  })
                }
              >
                <PlusIcon aria-hidden="true" />
                {t("Add condition")}
              </button>
            </>
          )}
        </Section>

        <Section
          title="Approvers"
          hint="Tiers are approved in order. Every approval in a tier is required; any one of the listed roles can give it."
          error={shown.approvers}
        >
          <ol className={s.tiers}>
            {draft.tiers.map((tier, tierIndex) => (
              <li key={tierIndex} className={s.tier}>
                <div className={s.tierHead}>
                  <span className={s.tierBadge}>
                    {t("Tier {count}", { count: tierIndex + 1 })}
                  </span>
                  <small>
                    {tierIndex === 0
                      ? t("Approves first")
                      : t("After tier {count} approves", { count: tierIndex })}
                  </small>
                  {draft.tiers.length > 1 && (
                    <button
                      type="button"
                      className={s.iconRemove}
                      aria-label={t("Remove tier {count}", {
                        count: tierIndex + 1,
                      })}
                      onClick={() =>
                        setTiers(draft.tiers.filter((_, i) => i !== tierIndex))
                      }
                    >
                      <TrashIcon aria-hidden="true" />
                    </button>
                  )}
                </div>
                {tier.and.map((group, groupIndex) => (
                  <div className={s.group} key={groupIndex}>
                    {groupIndex > 0 && <em className={s.joiner}>{t("and")}</em>}
                    <div className={s.groupBody}>
                      <span className={s.groupLabel}>
                        {t("Approval from any of")}
                      </span>
                      <RolePicker
                        roles={roles}
                        selected={group.or}
                        label={t("Approver roles")}
                        onChange={(or) =>
                          setTiers(
                            draft.tiers.map((item, i) =>
                              i !== tierIndex
                                ? item
                                : {
                                    and: item.and.map((g, j) =>
                                      j === groupIndex ? { or } : g,
                                    ),
                                  },
                            ),
                          )
                        }
                      />
                      {tier.and.length > 1 && (
                        <button
                          type="button"
                          className={s.iconRemove}
                          aria-label={t("Remove approval")}
                          onClick={() =>
                            setTiers(
                              draft.tiers.map((item, i) =>
                                i !== tierIndex
                                  ? item
                                  : {
                                      and: item.and.filter(
                                        (_, j) => j !== groupIndex,
                                      ),
                                    },
                              ),
                            )
                          }
                        >
                          <TrashIcon aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={s.addLink}
                  onClick={() =>
                    setTiers(
                      draft.tiers.map((item, i) =>
                        i === tierIndex
                          ? { and: [...item.and, { or: [] }] }
                          : item,
                      ),
                    )
                  }
                >
                  <PlusIcon aria-hidden="true" />
                  {t("Require another approval in this tier")}
                </button>
              </li>
            ))}
          </ol>
          {draft.tiers.length < 10 && (
            <button
              type="button"
              className={s.addButton}
              onClick={() => setTiers([...draft.tiers, { and: [{ or: [] }] }])}
            >
              <PlusIcon aria-hidden="true" />
              {t("Add tier")}
            </button>
          )}
        </Section>
      </fieldset>

      <aside className={s.summary}>
        <div className={s.summaryCard}>
          <h3>{t("Rule summary")}</h3>
          <p className={s.summaryUnit}>{businessUnitName}</p>
          <ol className={s.summarySteps}>
            <li>
              <b>{t("When")}</b>
              <span>
                {draft.requesters.length ? (
                  t("{roles} places an order", {
                    roles: draft.requesters
                      .map((key) => roleName(roles, key))
                      .join(` ${t("or")} `),
                  })
                ) : (
                  <i>{t("choose requester roles")}</i>
                )}
              </span>
            </li>
            <li>
              <b>{t("And")}</b>
              <span>
                {summaryConditions ? (
                  summaryConditions.length ? (
                    summaryConditions
                      .map((condition) => {
                        const text = describeCondition(
                          condition,
                          t,
                          currency,
                          locale,
                        );
                        return (
                          text.charAt(0).toLocaleLowerCase(locale) +
                          text.slice(1)
                        );
                      })
                      .join(` ${t(draft.combinator === "and" ? "and" : "or")} `)
                  ) : (
                    <i>{t("add a condition")}</i>
                  )
                ) : (
                  <code className={s.code}>{predicate || "—"}</code>
                )}
              </span>
            </li>
            <li>
              <b>{t("Then")}</b>
              <span>
                {draft.tiers.map((tier, index) => (
                  <span className={s.summaryTier} key={index}>
                    {t("Tier {count}", { count: index + 1 })}:{" "}
                    {tier.and
                      .map((group) =>
                        group.or.length
                          ? group.or
                              .map((key) => roleName(roles, key))
                              .join(` ${t("or")} `)
                          : "…",
                      )
                      .join(" + ")}
                  </span>
                ))}
              </span>
            </li>
          </ol>
          <RuleStatusBadge status={draft.status} />
        </div>
        {!readOnly && (
          <div className={s.actions}>
            <Link className={f.secondary} href={back}>
              {t("Cancel")}
            </Link>
            <button className={s.save} type="submit" disabled={busy}>
              {busy ? t("Saving…") : t(rule ? "Save changes" : "Create rule")}
            </button>
          </div>
        )}
        {submitted && Object.keys(errors).length > 0 && (
          <p className={s.fieldError} role="alert">
            {t("Fix the highlighted sections before saving.")}
          </p>
        )}
      </aside>
    </form>
  );
}
