"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/Toast";
import { LinkedAddressFields } from "@/components/LinkedAddressFields";
import { OrderDetails } from "@/components/OrderDetails";
import { WishlistsPage } from "@/components/WishlistsPage";
import { publishCustomerAuthChange } from "@/components/HeaderAccountLink";
import {
  accountHref,
  accountPages,
  type AccountPage,
} from "@/lib/account-pages";
import type {
  CustomerAddress,
  CustomerOrderDetail,
  CustomerOrderSummary,
  CustomerProfile,
} from "@/lib/types";
import {
  fetchCustomerOrders,
} from "@/lib/account-orders-api";
import { resetWishlists } from "@/lib/wishlist-api";

type Action = "login" | "register";

const emptyAddress: CustomerAddress = {
  country: "",
};

function customerName(customer: CustomerProfile) {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email
  );
}

function normalizeCustomer(customer: CustomerProfile): CustomerProfile {
  return { ...customer, addresses: customer.addresses ?? [] };
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function DashboardPage({
  customer,
}: {
  customer: CustomerProfile;
}) {
  return (
    <div className="account-content-grid">
      <section className="account-box">
        <h3>Contact Information</h3>
        <p>{customerName(customer)}</p>
        <p className="muted">{customer.email}</p>
        <Link className="text-button" href={accountHref("profile")}>
          Edit
        </Link>
      </section>
      <section className="account-box">
        <h3>Address Book</h3>
        <p className="muted">
          {customer.addresses.length
            ? `${customer.addresses.length} saved address${
                customer.addresses.length > 1 ? "es" : ""
              }`
            : "You have no saved addresses."}
        </p>
        <Link className="text-button" href={accountHref("addresses")}>
          Manage addresses
        </Link>
      </section>
    </div>
  );
}

function ProfilePage({
  customer,
  onCustomerChange,
}: {
  customer: CustomerProfile;
  onCustomerChange: (customer: CustomerProfile) => void;
}) {
  const [profile, setProfile] = useState({
    email: customer.email,
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [status, setStatus] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    setProfile({
      email: customer.email,
      firstName: customer.firstName ?? "",
      lastName: customer.lastName ?? "",
    });
  }, [customer]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    setStatus("Saving account information...");
    try {
      const data = await readJson<{ customer: CustomerProfile }>(
        await fetch("/api/customer/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...profile,
            email: profile.email.trim(),
            firstName: profile.firstName.trim(),
            lastName: profile.lastName.trim(),
          }),
        }),
      );
      onCustomerChange(data.customer);
      setStatus("Account information saved.");
      showToast("Account information saved.", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Profile update failed";
      setStatus(message);
      showToast(message, "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPassword) return;
    setSavingPassword(true);
    setStatus("Changing password...");
    try {
      await readJson<{ changed: true }>(
        await fetch("/api/customer/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(passwords),
        }),
      );
      setPasswords({ currentPassword: "", newPassword: "" });
      setStatus("Password changed.");
      showToast("Password changed.", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Password update failed";
      setStatus(message);
      showToast(message, "error");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="account-stack">
      <section className="account-box">
        <h3>Account Information</h3>
        <form className="account-stack" onSubmit={saveProfile}>
          <div className="form-grid compact">
            <input
              autoComplete="given-name"
              className="field"
              maxLength={50}
              placeholder="First name"
              value={profile.firstName}
              onChange={(event) =>
                setProfile({ ...profile, firstName: event.target.value })
              }
            />
            <input
              autoComplete="family-name"
              className="field"
              maxLength={50}
              placeholder="Last name"
              value={profile.lastName}
              onChange={(event) =>
                setProfile({ ...profile, lastName: event.target.value })
              }
            />
            <input
              autoComplete="email"
              className="field wide"
              placeholder="Email"
              required
              type="email"
              value={profile.email}
              onChange={(event) =>
                setProfile({ ...profile, email: event.target.value })
              }
            />
          </div>
          <button className="button accent" disabled={savingProfile} type="submit">
            {savingProfile ? "Saving…" : "Save account"}
          </button>
        </form>
      </section>

      <section className="account-box">
        <h3>Change Password</h3>
        <form className="account-stack" onSubmit={savePassword}>
          <div className="form-grid compact">
            <input
              autoComplete="current-password"
              className="field"
              minLength={1}
              placeholder="Current password"
              required
              type="password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords({
                  ...passwords,
                  currentPassword: event.target.value,
                })
              }
            />
            <input
              autoComplete="new-password"
              className="field"
              minLength={8}
              placeholder="New password"
              required
              type="password"
              value={passwords.newPassword}
              onChange={(event) =>
                setPasswords({ ...passwords, newPassword: event.target.value })
              }
            />
          </div>
          <button className="button" disabled={savingPassword} type="submit">
            {savingPassword ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}

function AddressBookPage({
  customer,
  onCustomerChange,
}: {
  customer: CustomerProfile;
  onCustomerChange: (customer: CustomerProfile) => void;
}) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>(customer.addresses);
  const [editing, setEditing] = useState<CustomerAddress>(emptyAddress);
  const [status, setStatus] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [removingAddressId, setRemovingAddressId] = useState<string | null>(null);
  const showToast = useToast();
  const busy = savingAddress || removingAddressId !== null;

  useEffect(() => {
    setAddresses(customer.addresses);
  }, [customer.addresses]);

  async function refreshAddresses() {
    const data = await readJson<{ addresses: CustomerAddress[] }>(
      await fetch("/api/customer/addresses"),
    );
    setAddresses(data.addresses);
  }

  useEffect(() => {
    refreshAddresses().catch((e) =>
      setStatus(e instanceof Error ? e.message : "Address read failed"),
    );
  }, []);

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSavingAddress(true);
    setStatus("Saving address...");
    try {
      const nextAddress = {
        ...editing,
        firstName: editing.firstName?.trim(),
        lastName: editing.lastName?.trim(),
        streetNumber: editing.streetNumber?.trim(),
        streetName: editing.streetName?.trim(),
        city: editing.city?.trim(),
        region: editing.region?.trim(),
        postalCode: editing.postalCode?.trim(),
        country: editing.country.trim().toUpperCase(),
        phone: editing.phone?.trim(),
      };
      const data = await readJson<{ customer: CustomerProfile }>(
        await fetch("/api/customer/addresses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextAddress),
        }),
      );
      onCustomerChange(data.customer);
      setEditing(emptyAddress);
      setStatus("Address saved.");
      showToast("Address saved.", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Address update failed";
      setStatus(message);
      showToast(message, "error");
    } finally {
      setSavingAddress(false);
    }
  }

  async function removeAddress(addressId: string) {
    if (busy) return;
    setRemovingAddressId(addressId);
    setStatus("Removing address...");
    try {
      const data = await readJson<{ customer: CustomerProfile }>(
        await fetch(`/api/customer/addresses?id=${encodeURIComponent(addressId)}`, {
          method: "DELETE",
        }),
      );
      onCustomerChange(data.customer);
      setStatus("Address removed.");
      showToast("Address removed.", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Address remove failed";
      setStatus(message);
      showToast(message, "error");
    } finally {
      setRemovingAddressId(null);
    }
  }

  return (
    <div className="account-stack">
      <section className="account-box">
        <h3>Default Addresses</h3>
        {addresses.length ? (
          <div className="address-list">
            {addresses.map((address) => (
              <article className="address-card" key={address.id}>
                <strong>
                  {[address.firstName, address.lastName].filter(Boolean).join(" ") ||
                    "Saved address"}
                </strong>
                <p className="muted">
                  {[address.streetNumber, address.streetName]
                    .filter(Boolean)
                    .join(" ")}
                  <br />
                  {[address.city, address.region, address.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                  <br />
                  {address.country}
                </p>
                <div className="inline-actions">
                  <button className="text-button" onClick={() => setEditing(address)}>
                    Edit
                  </button>
                  {address.id && (
                    <button
                      className="text-button danger"
                      disabled={busy}
                      onClick={() => removeAddress(address.id!)}
                    >
                      {removingAddressId === address.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">You have no saved addresses.</p>
        )}
      </section>

      <section className="account-box">
        <h3>{editing.id ? "Edit Address" : "Add New Address"}</h3>
        <form className="account-stack" onSubmit={saveAddress}>
          <div className="form-grid compact">
            <input
              autoComplete="given-name"
              className="field"
              maxLength={50}
              placeholder="First name"
              required
              value={editing.firstName ?? ""}
              onChange={(event) =>
                setEditing({ ...editing, firstName: event.target.value })
              }
            />
            <input
              autoComplete="family-name"
              className="field"
              maxLength={50}
              placeholder="Last name"
              required
              value={editing.lastName ?? ""}
              onChange={(event) =>
                setEditing({ ...editing, lastName: event.target.value })
              }
            />
            <input
              autoComplete="address-line2"
              className="field"
              maxLength={20}
              placeholder="Street number"
              value={editing.streetNumber ?? ""}
              onChange={(event) =>
                setEditing({ ...editing, streetNumber: event.target.value })
              }
            />
            <input
              autoComplete="address-line1"
              className="field"
              maxLength={120}
              placeholder="Street name"
              required
              value={editing.streetName ?? ""}
              onChange={(event) =>
                setEditing({ ...editing, streetName: event.target.value })
              }
            />
            <LinkedAddressFields
              address={editing}
              disabled={busy}
              onChange={setEditing}
            />
            <input
              autoComplete="tel"
              className="field wide"
              maxLength={30}
              pattern="^[0-9+().\\-\\s]{7,30}$"
              placeholder="Phone"
              title="Use 7 to 30 digits, spaces, or phone symbols."
              type="tel"
              value={editing.phone ?? ""}
              onChange={(event) =>
                setEditing({ ...editing, phone: event.target.value })
              }
            />
          </div>
          <button className="button accent" disabled={busy} type="submit">
            {savingAddress ? "Saving…" : "Save address"}
          </button>
        </form>
      </section>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}

function OrdersPage({
  initialOrder,
}: {
  initialOrder?: CustomerOrderDetail;
}) {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [status, setStatus] = useState("Loading orders...");
  const router = useRouter();

  useEffect(() => {
    fetchCustomerOrders()
      .then((nextOrders) => {
        setOrders(nextOrders);
        setStatus(nextOrders.length ? "" : "You have placed no orders.");
      })
      .catch((e) =>
        setStatus(e instanceof Error ? e.message : "Orders read failed"),
      );
  }, []);

  if (!orders.length && !initialOrder) return <p className="muted">{status}</p>;

  return (
    <div className="account-stack">
      {orders.length > 0 && <div className="account-table-wrap">
        <table className="account-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date</th>
            <th>Items</th>
            <th>Status</th>
            <th>Total</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.orderNumber}</td>
              <td>{new Date(order.createdAt).toLocaleDateString("en-US")}</td>
              <td>{order.lineCount}</td>
              <td>{order.orderState}</td>
              <td>{order.total.formatted}</td>
              <td>
                <Link
                  aria-label={`View order ${order.orderNumber} details`}
                  className="text-button order-detail-trigger"
                  href={`/account/orders/${encodeURIComponent(order.id)}`}
                >
                  View details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>}
      {initialOrder && (
        <OrderDetails
          order={initialOrder}
          onClose={() => router.push("/account/orders")}
        />
      )}
      {status && <p className="muted">{status}</p>}
    </div>
  );
}

export function AccountDashboard({
  customer,
  initialOrder,
  onLogout,
  status,
  loggingOut = false,
  initialPage = "dashboard",
}: {
  customer: CustomerProfile;
  initialOrder?: CustomerOrderDetail;
  onLogout: () => void;
  status: string;
  loggingOut?: boolean;
  initialPage?: AccountPage;
}) {
  const [activePage, setActivePage] = useState<AccountPage>(initialPage);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerProfile>(customer);

  useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);

  function updateCurrentCustomer(nextCustomer: CustomerProfile) {
    setCurrentCustomer(nextCustomer);
    publishCustomerAuthChange(nextCustomer);
  }

  useEffect(() => {
    setActivePage(initialPage);
  }, [initialPage]);

  function renderPage() {
    if (activePage === "profile") {
      return (
        <ProfilePage
          customer={currentCustomer}
          onCustomerChange={updateCurrentCustomer}
        />
      );
    }
    if (activePage === "addresses") {
      return (
        <AddressBookPage
          customer={currentCustomer}
          onCustomerChange={updateCurrentCustomer}
        />
      );
    }
    if (activePage === "orders") return <OrdersPage initialOrder={initialOrder} />;
    if (activePage === "wishlist") return <WishlistsPage />;
    return <DashboardPage customer={currentCustomer} />;
  }

  return (
    <section className="account-layout">
      <aside className="account-sidebar">
        <div className="account-sidebar-head">
          <span className="eyebrow">My Account</span>
          <h2>{customerName(currentCustomer)}</h2>
          <p className="muted">{currentCustomer.email}</p>
        </div>
        <nav className="account-menu" aria-label="My account pages">
          {accountPages.map((page) => (
            <Link
              aria-current={activePage === page.id ? "page" : undefined}
              href={page.href}
              key={page.id}
              onClick={() => setActivePage(page.id)}
            >
              {page.label}
            </Link>
          ))}
        </nav>
        <button className="button" disabled={loggingOut} onClick={onLogout}>
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </aside>

      <main className="account-main">
        <div className="account-main-head">
          <span className="eyebrow">My account</span>
          <h2>{accountPages.find((page) => page.id === activePage)?.label}</h2>
        </div>
        {renderPage()}
        {status && <p className="muted account-status">{status}</p>}
      </main>
    </section>
  );
}

export function AccountAuth({
  initialCustomer = null,
  initialOrder,
  initialPage = "dashboard",
}: {
  initialCustomer?: CustomerProfile | null;
  initialOrder?: CustomerOrderDetail;
  initialPage?: AccountPage;
}) {
  const [action, setAction] = useState<Action>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [customer, setCustomer] = useState<CustomerProfile | null>(
    initialCustomer,
  );
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  async function loadCustomer(quiet = false) {
    try {
      const data = await readJson<{ customer: CustomerProfile }>(
        await fetch("/api/customer/me"),
      );
      setCustomer(normalizeCustomer(data.customer));
      if (!quiet) setState(`Live customer ready: ${data.customer.email}`);
    } catch {
      if (!quiet) setState("");
    }
  }

  useEffect(() => {
    // The server already resolved the session; re-checking only causes a
    // login-form flash on first paint.
    if (initialCustomer) return;
    loadCustomer(true);
  }, [initialCustomer]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setState(`${action === "login" ? "Logging in" : "Registering"}...`);
    try {
      const response = await fetch(`/api/customer/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      const data = await readJson<{
        training?: boolean;
        customer: CustomerProfile;
      }>(response);
      await loadCustomer(true);
      const nextCustomer = normalizeCustomer(data.customer);
      setCustomer(nextCustomer);
      publishCustomerAuthChange(nextCustomer);
      setState(
        data.training
          ? `Training customer ready: ${data.customer.email}`
          : `Live customer ready: ${data.customer.email}`,
      );
      showToast(
        action === "login" ? "Logged in successfully." : "Account created.",
        "success",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Customer request failed";
      setState(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch("/api/customer/logout", { method: "POST" });
      if (!response.ok) {
        showToast("Logout failed. Please try again.", "error");
        return;
      }
      resetWishlists();
      setCustomer(null);
      publishCustomerAuthChange(null);
      setState("");
      router.replace("/account");
      showToast("You are logged out.", "success");
    } catch {
      showToast("Network error — logout failed.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  if (customer) {
    return (
      <AccountDashboard
        customer={customer}
        initialOrder={initialOrder}
        initialPage={initialPage}
        loggingOut={loggingOut}
        onLogout={logout}
        status={state}
      />
    );
  }

  return (
    <section className="panel account-auth-panel">
      <span className="eyebrow">Customer API</span>
      <h2>Login / register</h2>
      <div className="steps">
        <button
          className={`step ${action === "login" ? "on" : ""}`}
          disabled={submitting}
          onClick={() => setAction("login")}
          type="button"
        >
          Login
        </button>
        <button
          className={`step ${action === "register" ? "on" : ""}`}
          disabled={submitting}
          onClick={() => setAction("register")}
          type="button"
        >
          Register
        </button>
      </div>
      <form className="account-stack" onSubmit={submit}>
        <div className="form-grid">
          <input
            autoComplete="email"
            className="field wide"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            type="email"
          />
          <input
            autoComplete={
              action === "login" ? "current-password" : "new-password"
            }
            className="field wide"
            minLength={action === "register" ? 8 : 1}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            type="password"
          />
          {action === "register" && (
            <>
              <input
                autoComplete="given-name"
                className="field"
                maxLength={50}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                required
              />
              <input
                autoComplete="family-name"
                className="field"
                maxLength={50}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name"
                required
              />
            </>
          )}
        </div>
        <button className="button accent" disabled={submitting} type="submit">
          {submitting ? (
            action === "login" ? (
              "Logging in…"
            ) : (
              "Registering…"
            )
          ) : (
            <>
              <span>
                {action === "login" ? "Login customer" : "Register customer"}
              </span>
              <FontAwesomeIcon aria-hidden="true" icon={faArrowRight} />
            </>
          )}
        </button>
      </form>
      <p className="muted">{state}</p>
    </section>
  );
}
