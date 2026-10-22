"use client";
import { useB2BTranslations } from "./useB2BTranslations";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  HomeIcon,
  UserIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  HeartIcon,
  ListBulletIcon,
  ScaleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import type {
  B2BAccountAddress,
  B2BAccountProfile,
} from "@/lib/b2b/account-types";
import { countryDisplayName } from "@/lib/storefront-countries";
import { useStorefrontCountries } from "../useStorefrontCountries";
import { useB2B } from "./B2BProvider";
import { B2BAccount } from "./B2BAccount";
import { B2BCompanyWorkspace } from "./B2BCompanyWorkspace";
import { useB2BAccountProfile } from "./useB2BAccountProfile";
import s from "./B2BAccountWorkspace.module.css";

const links = [
  { href: "/b2b/account", label: "Dashboard", icon: HomeIcon },
  { href: "/b2b/account/profile", label: "My profile", icon: UserIcon },
  { href: "/b2b/account/addresses", label: "My addresses", icon: MapPinIcon },
  {
    href: "/b2b/account/company",
    label: "My company",
    icon: BuildingOffice2Icon,
  },
  {
    href: "/b2b/account/approval-flows",
    label: "Approval flows",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    href: "/b2b/account/approval-rules",
    label: "Approval rules",
    icon: ShieldCheckIcon,
  },
  { href: "/b2b/wishlist", label: "My Wishlist", icon: HeartIcon },
];
export function B2BAccountWorkspace({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { t, locale } = useB2BTranslations();
  const { state, busy, error, reload, act } = useB2B();
  const pathname = usePathname();
  if (!state)
    return (
      <main className={s.workspace}>
        <div className={s.loading} role="status">
          {error ? (
            <>
              <p>We couldn’t load your account.</p>
              <button
                className={s.button}
                type="button"
                disabled={busy}
                onClick={() => void reload()}
              >
                Try again
              </button>
            </>
          ) : (
            "Loading your account…"
          )}
        </div>
      </main>
    );
  if (!state.customer) return <B2BAccount />;
  return (
    <main className={s.workspace}>
      <aside className={s.sidebar}>
        <p className={s.sidebarTitle}>{t("MY ACCOUNT")}</p>
        <h2>{state.customer.firstName || "Your workspace"}</h2>
        <nav aria-label="Account navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (
                  href === "/b2b/account"
                    ? pathname === href
                    : pathname.startsWith(href)
                )
                  ? "page"
                  : undefined
              }
            >
              <Icon aria-hidden="true" />
              {t(label)}
            </Link>
          ))}
        </nav>
        <button
          className={s.logout}
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await act({ action: "logout" }))
              window.location.assign("/b2b/account");
          }}
        >
          <ArrowRightOnRectangleIcon aria-hidden="true" />
          {t("Log out")}
        </button>
      </aside>
      <div className={s.content}>
        <header className={s.heading}>
          <h1>{t(title)}</h1>
          {description && <p>{t(description)}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}
export function B2BAccountDashboard() {
  const { t, locale } = useB2BTranslations();
  const cards = [
    {
      href: "/b2b/account/profile",
      title: "My profile",
      description: "Your personal details, company roles and account security.",
      icon: UserIcon,
    },
    {
      href: "/b2b/account/addresses",
      title: "My addresses",
      description: "Manage your personal shipping and billing address book.",
      icon: MapPinIcon,
    },
    {
      href: "/b2b/account/company",
      title: "My company",
      description: "Your business units, assigned stores and team access.",
      icon: BuildingOffice2Icon,
    },
    {
      href: "/b2b/account/approval-flows",
      title: "Approval flows",
      description: "Review, approve or reject orders that need company sign-off.",
      icon: ClipboardDocumentCheckIcon,
    },
    {
      href: "/b2b/account/approval-rules",
      title: "Approval rules",
      description: "Set which orders need sign-off and who approves them.",
      icon: ShieldCheckIcon,
    },
    {
      href: "/b2b/wishlist",
      title: "My Wishlist",
      description: "Return to products saved to your personal wishlist.",
      icon: HeartIcon,
    },
    {
      href: "/b2b/quick-order",
      title: "Quick order",
      description: "Build a purchasing list using exact SKUs and quantities.",
      icon: ListBulletIcon,
    },
    {
      href: "/b2b/compare",
      title: "Compare equipment",
      description: "Review selected equipment specifications side by side.",
      icon: ScaleIcon,
    },
  ];
  return (
    <B2BAccountWorkspace
      title="My account"
      description="Everything you need to manage your business shopping, in one place."
    >
      <div className={s.cards}>
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link href={href} className={s.card} key={href}>
            <Icon aria-hidden="true" />
            <h2>{t(title)}</h2>
            <p>{t(description)}</p>
            <span className={s.cardAction}>{t("View details \u2192")}</span>
          </Link>
        ))}
      </div>
    </B2BAccountWorkspace>
  );
}
export function AccountAddress({ address }: { address?: B2BAccountAddress }) {
  if (!address) return <p>No default address selected.</p>;
  return (
    <address className={s.address}>
      <strong>{address.company}</strong>
      <br />
      {[address.firstName, address.lastName].filter(Boolean).join(" ")}
      <br />
      {[address.streetNumber, address.streetName].filter(Boolean).join(" ")}
      <br />
      {[address.city, address.region, address.postalCode]
        .filter(Boolean)
        .join(", ")}
      <br />
      {countryDisplayName(address.country)}
      {address.phone && (
        <>
          <br />
          {address.phone}
        </>
      )}
    </address>
  );
}
function AccountLoad({
  account,
  children,
}: {
  account: ReturnType<typeof useB2BAccountProfile>;
  children: ReactNode;
}) {
  return !account.profile ? (
    <div className={s.loading} role="status">
      {account.error ? (
        <>
          <p>{account.error}</p>
          <button className={s.button} onClick={account.retry}>
            Try again
          </button>
        </>
      ) : (
        "Loading account details…"
      )}
    </div>
  ) : (
    <>
      {children}
    </>
  );
}
export function B2BProfilePage() {
  const { t, locale } = useB2BTranslations();
  const { state } = useB2B();
  const account = useB2BAccountProfile();
  const p = account.profile;
  const activeCompany = p?.companies.find(
    (company) => company.key === state?.context?.businessUnitKey,
  );
  const companies = activeCompany ? [activeCompany] : p?.companies || [];
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <B2BAccountWorkspace
      title="My profile"
      description="Your personal details and the business associations assigned to your account."
    >
      <AccountLoad account={account}>
        {p && (
          <>
            <section className={s.panel}>
              <h2>{t("Profile details")}</h2>
              <dl className={s.metadata}>
                <dt>{t("Full name")}</dt>
                <dd>
                  {[p.firstName, p.lastName].filter(Boolean).join(" ") ||
                    "Not provided"}
                </dd>
                <dt>{t("Email address")}</dt>
                <dd>{p.email}</dd>
                <dt>{t("Company & roles")}</dt>
                <dd>
                  {companies.length
                    ? companies.map((company) => (
                        <div key={company.key}>
                          <strong>{company.name}</strong>
                          <br />
                          {company.roles.length
                            ? company.roles.join(", ")
                            : "No roles assigned"}
                        </div>
                      ))
                    : "No business company assigned yet."}
                </dd>
              </dl>
            </section>
            <div className={s.addresses}>
              <section className={s.panel}>
                <h2>{t("Default shipping address")}</h2>
                <AccountAddress
                  address={p.addresses.find(
                    (a) => a.id === p.defaultShippingAddressId,
                  )}
                />
                <div className={s.actions}>
                  <Link href="/b2b/account/addresses">
                    {t("Manage addresses")}
                  </Link>
                </div>
              </section>
              <section className={s.panel}>
                <h2>{t("Default billing address")}</h2>
                <AccountAddress
                  address={p.addresses.find(
                    (a) => a.id === p.defaultBillingAddressId,
                  )}
                />
                <div className={s.actions}>
                  <Link href="/b2b/account/addresses">
                    {t("Manage addresses")}
                  </Link>
                </div>
              </section>
            </div>
            <details className={s.accordion}>
              <summary>{t("Update personal details")}</summary>
              <div>
                <form
                  className={s.form}
                  key={`${p.firstName}-${p.lastName}-${p.email}`}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const f = new FormData(event.currentTarget);
                    await account.submit(
                      {
                        action: "update-profile",
                        firstName: String(f.get("firstName")).trim(),
                        lastName: String(f.get("lastName")).trim(),
                        email: String(f.get("email")).trim(),
                      },
                      "Your profile has been updated.",
                    );
                  }}
                >
                  <div className={s.fields}>
                    <label className={s.field}>
                      {t("First name")} *
                      <input
                        name="firstName"
                        autoComplete="given-name"
                        defaultValue={p.firstName}
                        required
                      />
                    </label>
                    <label className={s.field}>
                      {t("Last name")} *
                      <input
                        name="lastName"
                        autoComplete="family-name"
                        defaultValue={p.lastName}
                        required
                      />
                    </label>
                  </div>
                  <label className={s.field}>
                    {t("Email address")} *
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      defaultValue={p.email}
                      required
                    />
                  </label>
                  <div className={s.actions}>
                    <button className={s.primary} disabled={account.busy}>
                      {t("Save profile")}
                    </button>
                  </div>
                </form>
              </div>
            </details>
            <details className={s.accordion}>
              <summary>{t("Change password")}</summary>
              <div>
                <p>
                  After changing your password, you’ll need to sign in again.
                </p>
                <form
                  className={s.form}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const f = new FormData(form);
                    if (
                      await account.submit(
                        {
                          action: "change-password",
                          currentPassword: String(f.get("currentPassword")),
                          newPassword: String(f.get("newPassword")),
                        },
                        "Password changed. Please sign in again.",
                      )
                    )
                      form.reset();
                  }}
                >
                  <label className={s.field}>
                    Current password *
                    <input
                      type="password"
                      name="currentPassword"
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <label className={s.field}>
                    New password *
                    <input
                      type="password"
                      name="newPassword"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </label>
                  <div className={s.actions}>
                    <button className={s.primary} disabled={account.busy}>
                      {t("Change password")}
                    </button>
                  </div>
                </form>
              </div>
            </details>
            <details className={s.accordion}>
              <summary className={s.danger}>Delete my account</summary>
              <div>
                <p className={s.danger}>
                  Deleting your personal account is permanent. You will lose
                  access to this account and its business associations. This
                  does not delete the shared company.
                </p>
                <form
                  className={s.form}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!confirmDelete) return;
                    const f = new FormData(event.currentTarget);
                    await account.submit(
                      {
                        password: String(f.get("password")),
                        confirmation: "DELETE",
                      },
                      "Account deleted.",
                      "DELETE",
                    );
                  }}
                >
                  <label className={s.field}>
                    Current password *
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      required
                      checked={confirmDelete}
                      onChange={(event) =>
                        setConfirmDelete(event.target.checked)
                      }
                    />
                    I understand that deleting my account is permanent and
                    cannot be undone.
                  </label>
                  <div className={s.actions}>
                    <button
                      className={s.dangerButton}
                      disabled={account.busy || !confirmDelete}
                    >
                      Permanently delete account
                    </button>
                  </div>
                </form>
              </div>
            </details>
          </>
        )}
      </AccountLoad>
    </B2BAccountWorkspace>
  );
}
export function B2BAddressesPage() {
  const { t, locale } = useB2BTranslations();
  const account = useB2BAccountProfile();
  const p = account.profile;
  const [removeId, setRemoveId] = useState("");
  return (
    <B2BAccountWorkspace
      title="My addresses"
      description="Your personal account address book. These addresses are separate from shared business unit addresses."
    >
      <AccountLoad account={account}>
        {p && (
          <>
            <div
              className={s.actions}
              style={{ marginTop: 0, marginBottom: 24 }}
            >
              <Link className={s.primary} href="/b2b/account/addresses/new">
                + Add new address
              </Link>
            </div>
            {!p.addresses.length ? (
              <section className={s.panel}>
                <h2>No addresses yet</h2>
                <p>
                  Add a company address and choose your preferred shipping and
                  billing defaults.
                </p>
              </section>
            ) : (
              <div className={s.addresses}>
                {p.addresses.map((address) => (
                  <section className={s.panel} key={address.id}>
                    <AccountAddress address={address} />
                    <div className={s.badges}>
                      {address.id === p.defaultShippingAddressId && (
                        <span>Default shipping</span>
                      )}
                      {address.id === p.defaultBillingAddressId && (
                        <span>Default billing</span>
                      )}
                    </div>
                    <div className={s.actions}>
                      <Link
                        href={`/b2b/account/addresses/${encodeURIComponent(address.id!)}/edit`}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={account.busy}
                        onClick={() => setRemoveId(address.id!)}
                      >
                        Remove
                      </button>
                      {address.id !== p.defaultShippingAddressId && (
                        <button
                          type="button"
                          disabled={account.busy}
                          onClick={() =>
                            void account.submit(
                              {
                                action: "set-default-address",
                                addressId: address.id,
                                kind: "shipping",
                              },
                              "Default shipping address updated.",
                            )
                          }
                        >
                          Use for shipping
                        </button>
                      )}
                      {address.id !== p.defaultBillingAddressId && (
                        <button
                          type="button"
                          disabled={account.busy}
                          onClick={() =>
                            void account.submit(
                              {
                                action: "set-default-address",
                                addressId: address.id,
                                kind: "billing",
                              },
                              "Default billing address updated.",
                            )
                          }
                        >
                          Use for billing
                        </button>
                      )}
                    </div>
                    {removeId === address.id && (
                      <div className={s.feedback}>
                        <p>
                          Remove this address from your personal address book?
                        </p>
                        <div className={s.actions}>
                          <button
                            disabled={account.busy}
                            type="button"
                            onClick={async () => {
                              if (
                                await account.submit(
                                  {
                                    action: "delete-address",
                                    addressId: address.id,
                                  },
                                  "Address removed.",
                                )
                              )
                                setRemoveId("");
                            }}
                          >
                            Confirm removal
                          </button>
                          <button type="button" onClick={() => setRemoveId("")}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </AccountLoad>
    </B2BAccountWorkspace>
  );
}
export function addressFormPayload(form: FormData, id?: string) {
  const address = Object.fromEntries(
    [
      "firstName",
      "lastName",
      "company",
      "phone",
      "streetName",
      "streetNumber",
      "city",
      "region",
      "postalCode",
      "country",
    ].map((key) => [key, String(form.get(key) || "").trim()]),
  );
  if (
    [
      "firstName",
      "lastName",
      "company",
      "streetName",
      "city",
      "postalCode",
      "country",
    ].some((key) => !address[key])
  )
    throw new Error("Complete all required fields, including Company name.");
  return {
    action: "save-address",
    address: { ...address, ...(id ? { id } : {}) },
    defaultShipping: form.get("defaultShipping") === "on",
    defaultBilling: form.get("defaultBilling") === "on",
  };
}
export function B2BAddressForm({
  profile,
  address,
  countries,
  busy,
  onSubmit,
}: {
  profile: B2BAccountProfile;
  address?: B2BAccountAddress;
  countries: string[];
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const { t, locale } = useB2BTranslations();
  const [error, setError] = useState("");
  const options = [
    ...new Set([...(address?.country ? [address.country] : []), ...countries]),
  ];
  const field = (
    label: string,
    name: keyof B2BAccountAddress,
    required = false,
    fallback = "",
    autocomplete?: string,
  ) => (
    <label className={s.field}>
      {t(label)}
      {required ? " *" : ""}
      <input
        name={name}
        defaultValue={address?.[name] || fallback}
        required={required}
        autoComplete={autocomplete}
        type={name === "phone" ? "tel" : "text"}
      />
    </label>
  );
  return (
    <form
      className={s.form}
      onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        try {
          if (
            await onSubmit(
              addressFormPayload(
                new FormData(event.currentTarget),
                address?.id,
              ),
            )
          )
            window.location.assign("/b2b/account/addresses");
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Check the address fields.",
          );
        }
      }}
    >
      {error && (
        <p className={`${s.feedback} ${s.error}`} role="alert">
          {error}
        </p>
      )}
      <div className={s.fields}>
        {field(
          "First name",
          "firstName",
          true,
          profile.firstName,
          "given-name",
        )}
        {field("Last name", "lastName", true, profile.lastName, "family-name")}
      </div>
      {field("Company name", "company", true, "", "organization")}
      {field("Phone number", "phone", false, "", "tel")}
      <div className={s.fields}>
        {field("Street address", "streetName", true, "", "address-line1")}
        {field("Street number", "streetNumber")}
      </div>
      <div className={s.fields}>
        {field("City / suburb", "city", true, "", "address-level2")}
        {field(
          "State / province / region",
          "region",
          false,
          "",
          "address-level1",
        )}
      </div>
      <div className={s.fields}>
        {field("Postal code", "postalCode", true, "", "postal-code")}
        <label className={s.field}>
          {t("Country")} *
          <select
            name="country"
            defaultValue={address?.country || countries[0] || ""}
            required
            autoComplete="country"
          >
            <option value="">Select country</option>
            {options.map((code) => (
              <option key={code} value={code}>
                {countryDisplayName(code)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={s.check}>
        <input
          type="checkbox"
          name="defaultShipping"
          defaultChecked={Boolean(
            address?.id && address.id === profile.defaultShippingAddressId,
          )}
        />
        Use as my default shipping address
      </label>
      <label className={s.check}>
        <input
          type="checkbox"
          name="defaultBilling"
          defaultChecked={Boolean(
            address?.id && address.id === profile.defaultBillingAddressId,
          )}
        />
        Use as my default billing address
      </label>
      <div className={s.actions}>
        <button className={s.primary} disabled={busy || !options.length}>
          {busy ? "Saving…" : "Save address"}
        </button>
        <Link href="/b2b/account/addresses">Cancel</Link>
      </div>
    </form>
  );
}
export function B2BAddressEditor({ id }: { id?: string }) {
  const { t, locale } = useB2BTranslations();
  const account = useB2BAccountProfile();
  const country = useStorefrontCountries("b2b");
  const p = account.profile;
  const address = p?.addresses.find((address) => address.id === id);
  const countries = country.countries.length
    ? country.countries
    : p?.countries || [];
  return (
    <B2BAccountWorkspace
      title={id ? "Edit address" : "Add new address"}
      description="Company name is required for business deliveries. Fields marked * are required."
    >
      <AccountLoad account={account}>
        {p &&
          (id && !address ? (
            <div className={s.panel}>
              <p>This address is no longer available.</p>
              <Link href="/b2b/account/addresses">Back to addresses →</Link>
            </div>
          ) : (
            <section className={s.panel}>
              {!countries.length && (
                <p className={s.feedback} role="status">
                  {country.loading
                    ? "Loading available countries…"
                    : "Countries could not be loaded."}{" "}
                  {!country.loading && (
                    <button
                      className={s.button}
                      type="button"
                      onClick={country.retry}
                    >
                      Try again
                    </button>
                  )}
                </p>
              )}
              <B2BAddressForm
                key={`${id || "new"}-${p.id}`}
                profile={p}
                address={address}
                countries={countries}
                busy={account.busy}
                onSubmit={(body) => account.submit(body, "Address saved.")}
              />
            </section>
          ))}
      </AccountLoad>
    </B2BAccountWorkspace>
  );
}
export function B2BCompanyPage() {
  return (
    <B2BAccountWorkspace
      title="My company"
      description="Manage your business units and the people authorized to purchase with you."
    >
      <B2BCompanyWorkspace />
    </B2BAccountWorkspace>
  );
}
