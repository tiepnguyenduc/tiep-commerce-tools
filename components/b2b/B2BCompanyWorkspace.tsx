"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import type {
  CompanyAddress,
  CompanyAssociate,
  CompanyWorkspace,
} from "@/lib/b2b/company-types";
import { countryDisplayName } from "@/lib/storefront-countries";
import { useToast } from "@/components/Toast";
import { useB2B } from "./B2BProvider";
import { useB2BTranslations } from "./useB2BTranslations";
import s from "./B2BAccountWorkspace.module.css";

type Tab = "company" | "addresses" | "associates" | "units";
type Editor = {
  kind: "unit" | "address" | "associate" | "division";
  value?: CompanyAddress | CompanyAssociate;
} | null;

export function B2BCompanyWorkspace() {
  const { t } = useB2BTranslations();
  const { state, reload } = useB2B();
  const customerId = state?.customer?.id;
  const { data, error, isLoading, mutate } = useSWR<{
    company: CompanyWorkspace;
  }>(
    customerId ? ["/api/b2b/company", customerId] : null,
    async ([url]: [string, string]) => {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to load company details.");
      return result;
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const [selectedKey, setSelectedKey] = useState("");
  const [tab, setTab] = useState<Tab>("company");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor>(null);
  const [busy, setBusy] = useState(false);
  const showToast = useToast();
  const company = data?.company;
  useEffect(() => {
    if (!company?.units.length) return;
    const active = state?.context?.businessUnitKey;
    if (!selectedKey || !company.units.some((unit) => unit.key === selectedKey))
      setSelectedKey(
        company.units.some((unit) => unit.key === active)
          ? active!
          : company.units[0].key,
      );
  }, [company, selectedKey, state?.context?.businessUnitKey]);
  const unit =
    company?.units.find((item) => item.key === selectedKey) ??
    company?.units[0];
  const query = search.trim().toLowerCase();
  const addresses = useMemo(
    () =>
      unit?.addresses.filter(
        (item) =>
          !query ||
          Object.values(item).some((value) =>
            value.toLowerCase().includes(query),
          ),
      ) ?? [],
    [unit, query],
  );
  const associates = useMemo(
    () =>
      unit?.associates.filter(
        (item) =>
          !query ||
          `${item.name} ${item.email} ${item.roleKeys.join(" ")}`
            .toLowerCase()
            .includes(query),
      ) ?? [],
    [unit, query],
  );
  const units = useMemo(
    () =>
      company?.units.filter(
        (item) =>
          !query ||
          `${item.name} ${item.key} ${item.parentKey} ${item.email}`
            .toLowerCase()
            .includes(query),
      ) ?? [],
    [company, query],
  );

  async function submit(body: Record<string, unknown>, success: string) {
    if (busy) return false;
    setBusy(true);
    try {
      const response = await fetch("/api/b2b/company", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The change could not be completed.");
      await mutate(result, { revalidate: false });
      await reload();
      setEditor(null);
      showToast(success, "success");
      return true;
    } catch (problem) {
      showToast(
        problem instanceof Error
          ? problem.message
          : "The change could not be completed.",
        "error",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (isLoading)
    return <div className={s.loading}>Loading company details…</div>;
  if (error)
    return (
      <div className={s.loading}>
        <p>{error.message}</p>
        <button className={s.button} onClick={() => void mutate()}>
          Try again
        </button>
      </div>
    );
  if (!company?.units.length)
    return (
      <div className={s.panel}>
        <h2>No company assigned</h2>
        <p>
          Create your first company from the business account setup, or ask an
          administrator to add your account.
        </p>
      </div>
    );
  if (!unit) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "company", label: "Company" },
    { id: "addresses", label: "Addresses" },
    { id: "associates", label: "Associates" },
    { id: "units", label: "Business Units" },
  ];
  return (
    <>
      <label className={s.companyUnitSelect}>
        {t("Business unit")}
        <select
          value={unit.key}
          onChange={(event) => {
            setSelectedKey(event.target.value);
            setSearch("");
            setEditor(null);
          }}
        >
          {company.units.map((item) => (
            <option value={item.key} key={item.key}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div
        className={s.companyTabs}
        role="tablist"
        aria-label="Company sections"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setSearch("");
              setEditor(null);
            }}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {tab !== "company" && (
        <div className={s.companyToolbar}>
          <label className={s.companySearch}>
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
            />
          </label>
          {tab === "addresses" && (
            <button
              className={s.primary}
              onClick={() => setEditor({ kind: "address" })}
            >
              Add new address
            </button>
          )}
          {tab === "associates" && (
            <button
              className={s.primary}
              onClick={() => setEditor({ kind: "associate" })}
            >
              Add new associate
            </button>
          )}
          {tab === "units" && (
            <button
              className={s.primary}
              onClick={() => setEditor({ kind: "division" })}
            >
              Add new business unit
            </button>
          )}
        </div>
      )}

      {tab === "company" && (
        <div className={s.companyTable}>
          <div className={s.companyTableHead}>
            <span>Name</span>
            <span>Email</span>
            <span />
          </div>
          <div className={s.companyTableRow}>
            <span>{unit.name}</span>
            <span>{unit.email || "—"}</span>
            <span>
              {unit.canEditDetails && (
                <button onClick={() => setEditor({ kind: "unit" })}>
                  Edit
                </button>
              )}
            </span>
          </div>
        </div>
      )}
      {tab === "addresses" && (
        <div className={s.companyTable}>
          <div className={`${s.companyTableHead} ${s.addressGrid}`}>
            <span>Company name</span>
            <span>Address</span>
            <span>City</span>
            <span>State</span>
            <span>Postcode</span>
            <span>Country</span>
            <span />
          </div>
          {addresses.map((address) => (
            <div
              className={`${s.companyTableRow} ${s.addressGrid}`}
              key={address.id}
            >
              <span>{address.company || unit.name}</span>
              <span>
                {[address.streetNumber, address.streetName]
                  .filter(Boolean)
                  .join(" ")}
              </span>
              <span>{address.city}</span>
              <span>{address.region || "—"}</span>
              <span>{address.postalCode}</span>
              <span>{countryDisplayName(address.country)}</span>
              <span>
                {unit.canEditDetails && (
                  <>
                    <button
                      onClick={() =>
                        setEditor({ kind: "address", value: address })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className={s.removeLink}
                      onClick={() =>
                        void submit(
                          {
                            action: "remove-address",
                            businessUnitKey: unit.key,
                            addressId: address.id,
                          },
                          "Address removed.",
                        )
                      }
                    >
                      Remove
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {tab === "associates" && (
        <div className={s.companyTable}>
          <div className={`${s.companyTableHead} ${s.associateGrid}`}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span />
          </div>
          {associates.map((associate) => (
            <div
              className={`${s.companyTableRow} ${s.associateGrid}`}
              key={associate.customerId}
            >
              <span>{associate.name}</span>
              <span>{associate.email}</span>
              <span>
                {associate.roleKeys.join(", ") || "—"}
                {associate.inherited ? " (inherited)" : ""}
              </span>
              <span>
                {unit.canManageAssociates && !associate.inherited && (
                  <>
                    <button
                      onClick={() =>
                        setEditor({ kind: "associate", value: associate })
                      }
                    >
                      Edit
                    </button>
                    {associate.customerId !== customerId && (
                      <button
                        className={s.removeLink}
                        onClick={() =>
                          void submit(
                            {
                              action: "remove-associate",
                              businessUnitKey: unit.key,
                              customerId: associate.customerId,
                            },
                            "Associate removed.",
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {tab === "units" && (
        <div className={s.companyTable}>
          <div className={`${s.companyTableHead} ${s.unitGrid}`}>
            <span>Name</span>
            <span>Key</span>
            <span>Parent unit</span>
            <span>Email</span>
            <span />
          </div>
          {units.map((item) => (
            <div
              className={`${s.companyTableRow} ${s.unitGrid}`}
              key={item.key}
            >
              <span>{item.name}</span>
              <span>{item.key}</span>
              <span>{item.parentKey || "—"}</span>
              <span>{item.email || "—"}</span>
              <span>
                <button
                  onClick={() => {
                    setSelectedKey(item.key);
                    setTab("company");
                    setEditor(item.canEditDetails ? { kind: "unit" } : null);
                  }}
                >
                  View
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {editor && (
        <CompanyEditor
          editor={editor}
          unit={unit}
          company={company}
          busy={busy}
          close={() => setEditor(null)}
          submit={submit}
        />
      )}
    </>
  );
}

function CompanyEditor({
  editor,
  unit,
  company,
  busy,
  close,
  submit,
}: {
  editor: NonNullable<Editor>;
  unit: CompanyWorkspace["units"][number];
  company: CompanyWorkspace;
  busy: boolean;
  close: () => void;
  submit: (body: Record<string, unknown>, success: string) => Promise<boolean>;
}) {
  const address =
    editor.kind === "address"
      ? (editor.value as CompanyAddress | undefined)
      : undefined;
  const associate =
    editor.kind === "associate"
      ? (editor.value as CompanyAssociate | undefined)
      : undefined;
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (editor.kind === "unit")
      await submit(
        {
          action: "update-unit",
          businessUnitKey: unit.key,
          name: form.get("name"),
          email: form.get("email"),
        },
        "Company details updated.",
      );
    if (editor.kind === "division")
      await submit(
        {
          action: "create-unit",
          parentKey: unit.key,
          name: form.get("name"),
          email: form.get("email"),
        },
        "Business unit created.",
      );
    if (editor.kind === "address")
      await submit(
        {
          action: "save-address",
          businessUnitKey: unit.key,
          address: {
            id: address?.id,
            company: form.get("company"),
            streetName: form.get("streetName"),
            streetNumber: form.get("streetNumber"),
            city: form.get("city"),
            region: form.get("region"),
            postalCode: form.get("postalCode"),
            country: form.get("country"),
          },
        },
        "Address saved.",
      );
    if (editor.kind === "associate") {
      const roleKeys = form.getAll("roleKeys");
      if (!roleKeys.length) return;
      await submit(
        {
          action: "save-associate",
          businessUnitKey: unit.key,
          customerId: associate?.customerId,
          email: form.get("email"),
          roleKeys,
        },
        "Associate saved.",
      );
    }
  };
  return (
    <div
      className={s.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className={s.companyModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-editor-title"
      >
        <div className={s.modalHead}>
          <h2 id="company-editor-title">
            {editor.kind === "unit"
              ? "Edit company"
              : editor.kind === "division"
                ? "Add business unit"
                : editor.kind === "address"
                  ? address
                    ? "Edit address"
                    : "Add address"
                  : associate
                    ? "Edit associate"
                    : "Add associate"}
          </h2>
          <button type="button" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        <form className={s.form} onSubmit={onSubmit}>
          {(editor.kind === "unit" || editor.kind === "division") && (
            <>
              <label className={s.field}>
                Name *
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={editor.kind === "unit" ? unit.name : ""}
                />
              </label>
              <label className={s.field}>
                Email *
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={editor.kind === "unit" ? unit.email : ""}
                />
              </label>
            </>
          )}
          {editor.kind === "address" && (
            <>
              <div className={s.fields}>
                <label className={s.field}>
                  Company name
                  <input
                    name="company"
                    defaultValue={address?.company || unit.name}
                  />
                </label>
                <label className={s.field}>
                  Country *
                  <select
                    name="country"
                    required
                    defaultValue={
                      address?.country || company.countries[0] || ""
                    }
                  >
                    <option value="">Select country</option>
                    {company.countries.map((country) => (
                      <option key={country} value={country}>
                        {countryDisplayName(country)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={s.fields}>
                <label className={s.field}>
                  Street address *
                  <input
                    name="streetName"
                    required
                    defaultValue={address?.streetName}
                  />
                </label>
                <label className={s.field}>
                  Street number
                  <input
                    name="streetNumber"
                    defaultValue={address?.streetNumber}
                  />
                </label>
              </div>
              <div className={s.fields}>
                <label className={s.field}>
                  City *
                  <input name="city" required defaultValue={address?.city} />
                </label>
                <label className={s.field}>
                  State / region
                  <input name="region" defaultValue={address?.region} />
                </label>
              </div>
              <label className={s.field}>
                Postal code *
                <input
                  name="postalCode"
                  required
                  defaultValue={address?.postalCode}
                />
              </label>
            </>
          )}
          {editor.kind === "associate" && (
            <>
              <label className={s.field}>
                Email *
                <input
                  name="email"
                  type="email"
                  required
                  readOnly={Boolean(associate)}
                  defaultValue={associate?.email}
                />
              </label>
              <fieldset className={s.roleChoices}>
                <legend>Roles (select at least one) *</legend>
                {company.roles.map((role) => (
                  <label key={role.key}>
                    <input
                      type="checkbox"
                      name="roleKeys"
                      value={role.key}
                      defaultChecked={associate?.roleKeys.includes(role.key)}
                    />{" "}
                    <span>{role.name}</span>
                    <small>{role.key}</small>
                  </label>
                ))}
              </fieldset>
            </>
          )}
          <div className={s.actions}>
            <button className={s.primary} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
