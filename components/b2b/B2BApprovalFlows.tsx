"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type {
  ApprovalFlowDetail,
  ApprovalFlowList,
  ApprovalFlowStatus,
  ApprovalFlowSummary,
} from "@/lib/b2b/approval-types";
import { countryDisplayName } from "@/lib/storefront-countries";
import { useToast } from "@/components/Toast";
import { B2BAccountWorkspace } from "./B2BAccountWorkspace";
import { useB2B } from "./B2BProvider";
import { useB2BTranslations } from "./useB2BTranslations";
import s from "./B2BApprovalFlows.module.css";

const listPath = "/b2b/account/approval-flows";
const statuses: {
  id: ApprovalFlowStatus;
  label: string;
  icon: typeof ClockIcon;
}[] = [
  { id: "Pending", label: "Pending approval", icon: ClockIcon },
  { id: "Approved", label: "Approved", icon: CheckCircleIcon },
  { id: "Rejected", label: "Rejected", icon: XCircleIcon },
];
type Sort = "newest" | "oldest" | "highest" | "lowest";
const sorts: { id: Sort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "highest", label: "Highest total" },
  { id: "lowest", label: "Lowest total" },
];

export function isApprovalStatus(value: unknown): value is ApprovalFlowStatus {
  return statuses.some((status) => status.id === value);
}

export function filterApprovalFlows(
  flows: ApprovalFlowSummary[],
  status: ApprovalFlowStatus,
  search: string,
  sort: Sort,
) {
  const query = search.trim().toLowerCase();
  const amount = (flow: ApprovalFlowSummary) => flow.total?.centAmount ?? 0;
  return flows
    .filter((flow) => flow.status === status)
    .filter(
      (flow) =>
        !query ||
        `${flow.id} ${flow.orderNumber}`.toLowerCase().includes(query),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : sort === "highest"
          ? amount(b) - amount(a)
          : sort === "lowest"
            ? amount(a) - amount(b)
            : b.createdAt.localeCompare(a.createdAt),
    );
}

export function approvalFlowHref(
  flow: Pick<ApprovalFlowSummary, "id" | "businessUnitKey">,
) {
  return `${listPath}/${encodeURIComponent(flow.id)}?businessUnitKey=${encodeURIComponent(flow.businessUnitKey)}`;
}

export async function load<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Approval flows could not be loaded.");
  return result;
}

function formatDate(value: string, locale: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(
    locale,
    withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  ).format(date);
}

export function ApprovalStatusBadge({
  status,
  large,
}: {
  status: ApprovalFlowStatus;
  large?: boolean;
}) {
  const { t } = useB2BTranslations();
  const meta = statuses.find((item) => item.id === status) ?? statuses[0];
  const Icon = meta.icon;
  return (
    <span
      className={`${s.badge} ${s[`badge${status}`] ?? ""} ${large ? s.badgeLarge : ""}`}
    >
      <Icon aria-hidden="true" />
      {t(status === "Pending" ? "Pending" : meta.label)}
    </span>
  );
}

export function B2BApprovalFlowsPage({
  businessUnitKey,
  status,
}: {
  businessUnitKey?: string;
  status?: string;
}) {
  return (
    <B2BAccountWorkspace
      title="Approval flows"
      description="Orders that need sign-off from your company before they are released for fulfilment."
    >
      <ApprovalFlowList
        initialUnit={businessUnitKey ?? ""}
        initialStatus={isApprovalStatus(status) ? status : "Pending"}
      />
    </B2BAccountWorkspace>
  );
}

export function ApprovalFlowList({
  initialUnit,
  initialStatus,
}: {
  initialUnit: string;
  initialStatus: ApprovalFlowStatus;
}) {
  const { t, locale } = useB2BTranslations();
  const { state } = useB2B();
  const router = useRouter();
  const customerId = state?.customer?.id;
  const [unitKey, setUnitKey] = useState(initialUnit);
  const [status, setStatus] = useState<ApprovalFlowStatus>(initialStatus);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<ApprovalFlowList>(
      customerId ? [listPath, customerId, unitKey] : null,
      ([, , key]: [string, string, string]) =>
        load(
          `/api/b2b/approval-flows${key ? `?businessUnitKey=${encodeURIComponent(key)}` : ""}`,
        ),
      {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        keepPreviousData: true,
      },
    );
  const selectedUnit = unitKey || data?.businessUnitKey || "";
  const flows = useMemo(() => data?.flows ?? [], [data]);
  const visible = useMemo(
    () => filterApprovalFlows(flows, status, search, sort),
    [flows, status, search, sort],
  );
  const awaitingYou = flows.filter((flow) => flow.canDecide).length;

  function sync(next: { unit?: string; status?: ApprovalFlowStatus }) {
    const params = new URLSearchParams();
    const unit = next.unit ?? selectedUnit;
    if (unit) params.set("businessUnitKey", unit);
    params.set("status", next.status ?? status);
    router.replace(`${listPath}?${params}`, { scroll: false });
  }

  if (error && !data)
    return (
      <div className={s.state} role="alert">
        <XCircleIcon aria-hidden="true" />
        <h2>{t("Approval flows could not be loaded.")}</h2>
        <p>{error.message}</p>
        <button
          className={s.secondary}
          type="button"
          onClick={() => void mutate()}
        >
          {t("Try again")}
        </button>
      </div>
    );

  return (
    <div className={s.approvals}>
      <div className={s.toolbar}>
        <label className={s.field}>
          {t("Business unit")}
          <select
            value={selectedUnit}
            disabled={!data?.units.length}
            onChange={(event) => {
              setUnitKey(event.target.value);
              setSearch("");
              sync({ unit: event.target.value });
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
        <button
          className={s.iconButton}
          type="button"
          onClick={() => void mutate()}
          disabled={isValidating}
          aria-label={t("Refresh approval flows")}
          title={t("Refresh approval flows")}
        >
          <ArrowPathIcon
            aria-hidden="true"
            className={isValidating ? s.spin : undefined}
          />
        </button>
      </div>

      {awaitingYou > 0 && (
        <button
          type="button"
          className={s.callout}
          onClick={() => {
            setStatus("Pending");
            sync({ status: "Pending" });
          }}
        >
          <ClipboardDocumentCheckIcon aria-hidden="true" />
          <span>
            <strong>
              {t(
                awaitingYou === 1
                  ? "1 order is waiting for your decision"
                  : "{count} orders are waiting for your decision",
                { count: awaitingYou },
              )}
            </strong>
            <small>
              {t("Review the order details, then approve or reject it.")}
            </small>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </button>
      )}

      <div className={s.tabs} role="tablist" aria-label={t("Approval status")}>
        {statuses.map(({ id, label, icon: Icon }) => {
          const count = flows.filter((flow) => flow.status === id).length;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={status === id}
              className={`${s.tab} ${s[`tab${id}`]}`}
              onClick={() => {
                setStatus(id);
                sync({ status: id });
              }}
            >
              <span className={s.tabIcon}>
                <Icon aria-hidden="true" />
              </span>
              <span className={s.tabLabel}>{t(label)}</span>
              <strong className={s.tabCount}>{isLoading ? "–" : count}</strong>
            </button>
          );
        })}
      </div>

      <div className={s.filters}>
        <label className={s.search}>
          <span className="sr-only">{t("Search for flow")}</span>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search by flow ID or order number…")}
          />
        </label>
        <label className={s.sort}>
          <span>{t("Sort by")}</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            {sorts.map((item) => (
              <option key={item.id} value={item.id}>
                {t(item.label)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className={s.table} aria-busy="true" role="status">
          <span className="sr-only">{t("Loading approval flows…")}</span>
          {[0, 1, 2].map((row) => (
            <div className={s.skeletonRow} key={row}>
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : !visible.length ? (
        <div className={s.state}>
          <InboxIcon aria-hidden="true" />
          <h2>
            {search
              ? t("No approval flows match your search")
              : t(
                  status === "Pending"
                    ? "Nothing is waiting for approval"
                    : status === "Approved"
                      ? "No approved flows yet"
                      : "No rejected flows",
                )}
          </h2>
          <p>
            {search
              ? t("Check the flow ID or order number and try again.")
              : t(
                  "Orders that match an approval rule for this business unit will appear here.",
                )}
          </p>
          {search && (
            <button
              className={s.secondary}
              type="button"
              onClick={() => setSearch("")}
            >
              {t("Clear search")}
            </button>
          )}
        </div>
      ) : (
        <div className={s.table} role="table" aria-label={t("Approval flows")}>
          <div className={`${s.row} ${s.head}`} role="row">
            <span role="columnheader">{t("Status")}</span>
            <span role="columnheader">{t("Approval flow")}</span>
            <span role="columnheader">{t("Date")}</span>
            <span role="columnheader">{t("Items")}</span>
            <span role="columnheader" className={s.numeric}>
              {t("Total")}
            </span>
            <span role="columnheader">
              <span className="sr-only">{t("Actions")}</span>
            </span>
          </div>
          {visible.map((flow) => (
            <div
              className={`${s.row} ${flow.canDecide ? s.rowAttention : ""}`}
              role="row"
              key={flow.id}
            >
              <span role="cell" data-label={t("Status")}>
                <ApprovalStatusBadge status={flow.status} />
              </span>
              <span
                role="cell"
                className={s.flowCell}
                data-label={t("Approval flow")}
              >
                <Link href={approvalFlowHref(flow)} className={s.mono}>
                  {flow.id}
                </Link>
                <small>
                  {flow.orderNumber
                    ? `${t("Order")} ${flow.orderNumber}`
                    : flow.businessUnitName}
                </small>
              </span>
              <span role="cell" data-label={t("Date")}>
                {formatDate(flow.createdAt, locale)}
              </span>
              <span role="cell" data-label={t("Items")}>
                {flow.itemCount || "—"}
              </span>
              <span
                role="cell"
                className={`${s.numeric} ${s.total}`}
                data-label={t("Total")}
              >
                {flow.total?.formatted ?? "—"}
              </span>
              <span role="cell" className={s.rowAction}>
                <Link
                  href={approvalFlowHref(flow)}
                  className={flow.canDecide ? s.reviewLink : s.viewLink}
                >
                  {t(flow.canDecide ? "Review" : "View")}
                  <ChevronRightIcon aria-hidden="true" />
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
      {!isLoading && visible.length > 0 && (
        <p className={s.footnote}>
          {t("Showing {count} of {total} approval flows", {
            count: visible.length,
            total: flows.filter((flow) => flow.status === status).length,
          })}
        </p>
      )}
    </div>
  );
}

export function B2BApprovalFlowDetailPage({
  id,
  businessUnitKey,
}: {
  id: string;
  businessUnitKey?: string;
}) {
  return (
    <B2BAccountWorkspace title="Approval flow details">
      <ApprovalFlowDetailView id={id} businessUnitKey={businessUnitKey ?? ""} />
    </B2BAccountWorkspace>
  );
}

export function ApprovalFlowDetailView({
  id,
  businessUnitKey,
}: {
  id: string;
  businessUnitKey: string;
}) {
  const { t, locale } = useB2BTranslations();
  const { state } = useB2B();
  const showToast = useToast();
  const { mutate: mutateGlobal } = useSWRConfig();
  const customerId = state?.customer?.id;
  const url = `/api/b2b/approval-flows/${encodeURIComponent(id)}${businessUnitKey ? `?businessUnitKey=${encodeURIComponent(businessUnitKey)}` : ""}`;
  const { data, error, isLoading, mutate } = useSWR<{
    flow: ApprovalFlowDetail;
  }>(
    customerId ? [url, customerId] : null,
    ([path]: [string, string]) => load(path),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState<"" | "approve" | "reject">("");
  const flow = data?.flow;
  const back = `${listPath}?${new URLSearchParams({ ...(flow?.businessUnitKey || businessUnitKey ? { businessUnitKey: flow?.businessUnitKey || businessUnitKey } : {}), status: flow?.status ?? "Pending" })}`;

  async function decide(
    body: { action: "approve" } | { action: "reject"; reason: string },
  ) {
    if (!flow || busy) return;
    setBusy(body.action);
    try {
      const response = await fetch(
        `/api/b2b/approval-flows/${encodeURIComponent(flow.id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            businessUnitKey: flow.businessUnitKey,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The decision could not be saved.");
      await mutate(result, { revalidate: false });
      await mutateGlobal((key) => Array.isArray(key) && key[0] === listPath);
      setRejecting(false);
      showToast(
        t(
          body.action === "approve"
            ? "Approval recorded."
            : "Approval flow rejected.",
        ),
        "success",
      );
    } catch (problem) {
      showToast(
        problem instanceof Error
          ? problem.message
          : t("The decision could not be saved."),
        "error",
      );
    } finally {
      setBusy("");
    }
  }

  const backLink = (
    <Link href={back} className={s.backLink}>
      <ArrowLeftIcon aria-hidden="true" />
      {t("Back to approval flows")}
    </Link>
  );

  if (isLoading || (!flow && !error))
    return (
      <div className={s.approvals}>
        {backLink}
        <div className={s.detailSkeleton} role="status">
          <span className="sr-only">{t("Loading approval flow…")}</span>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  if (error || !flow)
    return (
      <div className={s.approvals}>
        {backLink}
        <div className={s.state} role="alert">
          <XCircleIcon aria-hidden="true" />
          <h2>{t("This approval flow could not be loaded.")}</h2>
          <p>{error?.message}</p>
          <button
            className={s.secondary}
            type="button"
            onClick={() => void mutate()}
          >
            {t("Try again")}
          </button>
        </div>
      </div>
    );

  const onReject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    ).trim();
    if (reason) void decide({ action: "reject", reason });
  };

  return (
    <div className={s.approvals}>
      {backLink}
      <section className={`${s.hero} ${s[`hero${flow.status}`] ?? ""}`}>
        <div className={s.heroMain}>
          <ApprovalStatusBadge status={flow.status} large />
          <h2>
            {flow.orderNumber
              ? `${t("Order")} ${flow.orderNumber}`
              : t("Order awaiting approval")}
          </h2>
          <p>
            {t("Submitted {date}", {
              date: formatDate(flow.createdAt, locale, true),
            })}
            {flow.requester && (
              <> · {t("by {name}", { name: flow.requester.name })}</>
            )}
          </p>
        </div>
        <div className={s.heroTotal}>
          <span>{t("Order total")}</span>
          <strong>{flow.total?.formatted ?? "—"}</strong>
          <small>
            {t(flow.itemCount === 1 ? "1 item" : "{count} items", {
              count: flow.itemCount,
            })}
          </small>
        </div>
        {flow.canDecide && (
          <div className={s.decision}>
            <p>
              <ClipboardDocumentCheckIcon aria-hidden="true" />
              {t(
                flow.canApprove
                  ? "Your approval is required for this order."
                  : "You can still reject this order while it is pending.",
              )}
            </p>
            {!rejecting ? (
              <div className={s.decisionActions}>
                <button
                  className={s.rejectButton}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => setRejecting(true)}
                >
                  <XCircleIcon aria-hidden="true" />
                  {t("Reject")}
                </button>
                {flow.canApprove && (
                  <button
                    className={s.approveButton}
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void decide({ action: "approve" })}
                  >
                    <CheckCircleIcon aria-hidden="true" />
                    {busy === "approve" ? t("Approving…") : t("Approve order")}
                  </button>
                )}
              </div>
            ) : (
              <form className={s.rejectForm} onSubmit={onReject}>
                <label>
                  {t("Reason for rejection")} *
                  <textarea
                    name="reason"
                    required
                    maxLength={500}
                    rows={3}
                    autoFocus
                    placeholder={t("Explain what the requester should change…")}
                  />
                </label>
                <div className={s.decisionActions}>
                  <button
                    className={s.secondary}
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => setRejecting(false)}
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    className={s.rejectSolid}
                    type="submit"
                    disabled={Boolean(busy)}
                  >
                    {busy === "reject"
                      ? t("Rejecting…")
                      : t("Confirm rejection")}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {flow.rejection && (
        <section className={s.rejection}>
          <XCircleIcon aria-hidden="true" />
          <div>
            <h3>{t("Rejection reason")}</h3>
            <p>{flow.rejection.reason || t("No reason was provided.")}</p>
            <small>
              {t("Rejected by {name} on {date}", {
                name: flow.rejection.name,
                date: formatDate(flow.rejection.at, locale, true),
              })}
            </small>
          </div>
        </section>
      )}

      <section className={s.card}>
        <dl className={s.facts}>
          <div>
            <dt>{t("Approval flow ID")}</dt>
            <dd className={s.copyable}>
              <span className={s.mono}>{flow.id}</span>
              <button
                type="button"
                aria-label={t("Copy approval flow ID")}
                title={t("Copy approval flow ID")}
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(flow.id)
                    .then(() =>
                      showToast(t("Approval flow ID copied."), "success"),
                    )
                }
              >
                <DocumentDuplicateIcon aria-hidden="true" />
              </button>
            </dd>
          </div>
          <div>
            <dt>{t("Creation date")}</dt>
            <dd>{formatDate(flow.createdAt, locale)}</dd>
          </div>
          <div>
            <dt>{t("Business unit")}</dt>
            <dd>{flow.businessUnitName}</dd>
          </div>
          <div>
            <dt>{t("Order number")}</dt>
            <dd className={s.mono}>{flow.orderNumber || "—"}</dd>
          </div>
          <div>
            <dt>{t("Requested by")}</dt>
            <dd>
              {flow.requester ? (
                <>
                  {flow.requester.name}
                  {flow.requester.email && (
                    <small>{flow.requester.email}</small>
                  )}
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>{t("Last updated")}</dt>
            <dd>{formatDate(flow.lastModifiedAt, locale, true)}</dd>
          </div>
        </dl>
      </section>

      <div className={s.detailGrid}>
        <section className={s.card}>
          <h3 className={s.cardTitle}>{t("Order items")}</h3>
          {!flow.lineItems.length ? (
            <p className={s.muted}>
              {t("Order lines are not available for your role.")}
            </p>
          ) : (
            <ul className={s.lines}>
              {flow.lineItems.map((line) => (
                <li key={line.id}>
                  <span className={s.thumb}>
                    {line.image ? (
                      <img src={line.image} alt="" loading="lazy" />
                    ) : (
                      <InboxIcon aria-hidden="true" />
                    )}
                  </span>
                  <span className={s.lineInfo}>
                    <strong>{line.name}</strong>
                    {line.sku && (
                      <small>
                        {t("SKU")} {line.sku}
                      </small>
                    )}
                    <small>
                      {line.quantity} × {line.unitPrice?.formatted ?? "—"}
                    </small>
                  </span>
                  <span className={s.lineTotal}>
                    {line.total?.formatted ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <dl className={s.totals}>
            {flow.subtotal && (
              <div>
                <dt>{t("Subtotal")}</dt>
                <dd>{flow.subtotal.formatted}</dd>
              </div>
            )}
            {flow.shipping && (
              <div>
                <dt>{t("Shipping")}</dt>
                <dd>{flow.shipping.formatted}</dd>
              </div>
            )}
            {flow.tax && (
              <div>
                <dt>{t("Tax")}</dt>
                <dd>{flow.tax.formatted}</dd>
              </div>
            )}
            <div className={s.grandTotal}>
              <dt>{t("Total")}</dt>
              <dd>{flow.total?.formatted ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <div className={s.sideColumn}>
          <section className={s.card}>
            <h3 className={s.cardTitle}>{t("Approval progress")}</h3>
            <ol className={s.timeline}>
              <li className={s.stepDone}>
                <span className={s.dot}>
                  <PaperAirplaneIcon aria-hidden="true" />
                </span>
                <div>
                  <strong>{t("Order submitted for approval")}</strong>
                  <small>
                    {[
                      flow.requester?.name,
                      formatDate(flow.createdAt, locale, true),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
              </li>
              {flow.approvals.map((approval, index) => (
                <li
                  className={s.stepDone}
                  key={`${approval.email}-${approval.at}-${index}`}
                >
                  <span className={s.dot}>
                    <CheckCircleIcon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {t("Approved by {name}", { name: approval.name })}
                    </strong>
                    <small>{formatDate(approval.at, locale, true)}</small>
                  </div>
                </li>
              ))}
              {flow.status === "Pending" && (
                <li className={s.stepCurrent}>
                  <span className={s.dot}>
                    <ClockIcon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{t("Waiting for approval")}</strong>
                    {flow.awaitingRoles.length > 0 && (
                      <span className={s.roles}>
                        {flow.awaitingRoles.map((role) => (
                          <em key={role}>{role}</em>
                        ))}
                      </span>
                    )}
                  </div>
                </li>
              )}
              {flow.status === "Rejected" && flow.rejection && (
                <li className={s.stepRejected}>
                  <span className={s.dot}>
                    <XCircleIcon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {t("Rejected by {name}", { name: flow.rejection.name })}
                    </strong>
                    <small>{formatDate(flow.rejection.at, locale, true)}</small>
                  </div>
                </li>
              )}
              {flow.status === "Approved" && (
                <li className={s.stepApproved}>
                  <span className={s.dot}>
                    <CheckCircleIcon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{t("Order fully approved")}</strong>
                    <small>
                      {formatDate(flow.lastModifiedAt, locale, true)}
                    </small>
                  </div>
                </li>
              )}
            </ol>
          </section>

          {flow.rules.length > 0 && (
            <section className={s.card}>
              <h3 className={s.cardTitle}>{t("Matched approval rules")}</h3>
              <ul className={s.rules}>
                {flow.rules.map((rule) => (
                  <li key={rule.name}>
                    <strong>{rule.name}</strong>
                    {rule.description && <small>{rule.description}</small>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {flow.shippingAddress && (
            <section className={s.card}>
              <h3 className={s.cardTitle}>{t("Shipping address")}</h3>
              <address className={s.address}>
                {flow.shippingAddress.company && (
                  <strong>{flow.shippingAddress.company}</strong>
                )}
                {flow.shippingAddress.name && (
                  <span>{flow.shippingAddress.name}</span>
                )}
                {flow.shippingAddress.street && (
                  <span>{flow.shippingAddress.street}</span>
                )}
                <span>
                  {[
                    flow.shippingAddress.city,
                    flow.shippingAddress.region,
                    flow.shippingAddress.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
                <span>{countryDisplayName(flow.shippingAddress.country)}</span>
              </address>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
