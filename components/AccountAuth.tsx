"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import type {
  CustomerAddress,
  CustomerOrderSummary,
  CustomerProfile,
  Wishlist,
} from "@/lib/types";

type Action = "login" | "register";
type AccountPage = "dashboard" | "profile" | "addresses" | "orders" | "wishlist";

const accountPages: { id: AccountPage; label: string }[] = [
  { id: "dashboard", label: "Account Dashboard" },
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
  { id: "orders", label: "My Orders" },
  { id: "wishlist", label: "My Wishlist" },
];

const emptyAddress: CustomerAddress = {
  country: "US",
};

function customerName(customer: CustomerProfile) {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email
  );
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
  onNavigate,
}: {
  customer: CustomerProfile;
  onNavigate: (page: AccountPage) => void;
}) {
  return (
    <div className="account-content-grid">
      <section className="account-box">
        <h3>Contact Information</h3>
        <p>{customerName(customer)}</p>
        <p className="muted">{customer.email}</p>
        <button className="text-button" onClick={() => onNavigate("profile")}>
          Edit
        </button>
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
        <button className="text-button" onClick={() => onNavigate("addresses")}>
          Manage addresses
        </button>
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

  async function saveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    setStatus("Saving account information...");
    try {
      const data = await readJson<{ customer: CustomerProfile }>(
        await fetch("/api/customer/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
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

  async function savePassword() {
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
        <div className="form-grid compact">
          <input
            className="field"
            placeholder="First name"
            value={profile.firstName}
            onChange={(event) =>
              setProfile({ ...profile, firstName: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Last name"
            value={profile.lastName}
            onChange={(event) =>
              setProfile({ ...profile, lastName: event.target.value })
            }
          />
          <input
            className="field wide"
            placeholder="Email"
            value={profile.email}
            onChange={(event) =>
              setProfile({ ...profile, email: event.target.value })
            }
          />
        </div>
        <button
          className="button accent"
          disabled={savingProfile}
          onClick={saveProfile}
        >
          {savingProfile ? "Saving…" : "Save account"}
        </button>
      </section>

      <section className="account-box">
        <h3>Change Password</h3>
        <div className="form-grid compact">
          <input
            className="field"
            placeholder="Current password"
            type="password"
            value={passwords.currentPassword}
            onChange={(event) =>
              setPasswords({ ...passwords, currentPassword: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="New password"
            type="password"
            value={passwords.newPassword}
            onChange={(event) =>
              setPasswords({ ...passwords, newPassword: event.target.value })
            }
          />
        </div>
        <button
          className="button"
          disabled={savingPassword}
          onClick={savePassword}
        >
          {savingPassword ? "Changing…" : "Change password"}
        </button>
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

  async function saveAddress() {
    if (busy) return;
    setSavingAddress(true);
    setStatus("Saving address...");
    try {
      const data = await readJson<{ customer: CustomerProfile }>(
        await fetch("/api/customer/addresses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
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
        <div className="form-grid compact">
          <input
            className="field"
            placeholder="First name"
            value={editing.firstName ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, firstName: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Last name"
            value={editing.lastName ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, lastName: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Street number"
            value={editing.streetNumber ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, streetNumber: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Street name"
            value={editing.streetName ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, streetName: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="City"
            value={editing.city ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, city: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Region"
            value={editing.region ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, region: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Postal code"
            value={editing.postalCode ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, postalCode: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Country"
            value={editing.country}
            onChange={(event) =>
              setEditing({ ...editing, country: event.target.value.toUpperCase() })
            }
          />
          <input
            className="field wide"
            placeholder="Phone"
            value={editing.phone ?? ""}
            onChange={(event) =>
              setEditing({ ...editing, phone: event.target.value })
            }
          />
        </div>
        <button
          className="button accent"
          disabled={busy}
          onClick={saveAddress}
        >
          {savingAddress ? "Saving…" : "Save address"}
        </button>
      </section>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [status, setStatus] = useState("Loading orders...");

  useEffect(() => {
    fetch("/api/customer/orders")
      .then((response) => readJson<{ orders: CustomerOrderSummary[] }>(response))
      .then((data) => {
        setOrders(data.orders);
        setStatus(data.orders.length ? "" : "You have placed no orders.");
      })
      .catch((e) =>
        setStatus(e instanceof Error ? e.message : "Orders read failed"),
      );
  }, []);

  if (!orders.length) return <p className="muted">{status}</p>;

  return (
    <div className="account-table-wrap">
      <table className="account-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date</th>
            <th>Items</th>
            <th>Status</th>
            <th>Total</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WishlistPage() {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [status, setStatus] = useState("Loading wishlist...");
  const [removingLineId, setRemovingLineId] = useState<string | null>(null);
  const showToast = useToast();

  async function refreshWishlist() {
    const data = await readJson<{ wishlist: Wishlist }>(await fetch("/api/wishlist"));
    setWishlist(data.wishlist);
    setStatus(data.wishlist.lines.length ? "" : "Your wishlist is empty.");
  }

  useEffect(() => {
    refreshWishlist().catch((e) =>
      setStatus(e instanceof Error ? e.message : "Wishlist read failed"),
    );
  }, []);

  async function removeLine(lineItemId: string) {
    if (removingLineId) return;
    setRemovingLineId(lineItemId);
    setStatus("Removing wishlist item...");
    try {
      const data = await readJson<{ wishlist: Wishlist }>(
        await fetch(
          `/api/wishlist/items?lineItemId=${encodeURIComponent(lineItemId)}`,
          { method: "DELETE" },
        ),
      );
      setWishlist(data.wishlist);
      setStatus(data.wishlist.lines.length ? "" : "Your wishlist is empty.");
      showToast("Item removed from your wishlist.", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Wishlist remove failed";
      setStatus(message);
      showToast(message, "error");
    } finally {
      setRemovingLineId(null);
    }
  }

  if (!wishlist?.lines.length) return <p className="muted">{status}</p>;

  return (
    <div className="wishlist-list">
      {wishlist.lines.map((line) => (
        <article className="wishlist-row" key={line.id}>
          <img src={line.image} alt={line.name} />
          <div>
            <h3>{line.name}</h3>
            <p className="muted">
              SKU: {line.sku} · Quantity: {line.quantity}
            </p>
          </div>
          <button
            className="text-button danger"
            disabled={removingLineId !== null}
            onClick={() => removeLine(line.id)}
          >
            {removingLineId === line.id ? "Removing…" : "Remove"}
          </button>
        </article>
      ))}
      {status && <p className="muted">{status}</p>}
    </div>
  );
}

export function AccountDashboard({
  customer,
  onLogout,
  status,
  loggingOut = false,
}: {
  customer: CustomerProfile;
  onLogout: () => void;
  status: string;
  loggingOut?: boolean;
}) {
  const [activePage, setActivePage] = useState<AccountPage>("dashboard");
  const [currentCustomer, setCurrentCustomer] = useState<CustomerProfile>(customer);

  useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);

  function renderPage() {
    if (activePage === "profile") {
      return (
        <ProfilePage
          customer={currentCustomer}
          onCustomerChange={setCurrentCustomer}
        />
      );
    }
    if (activePage === "addresses") {
      return (
        <AddressBookPage
          customer={currentCustomer}
          onCustomerChange={setCurrentCustomer}
        />
      );
    }
    if (activePage === "orders") return <OrdersPage />;
    if (activePage === "wishlist") return <WishlistPage />;
    return <DashboardPage customer={currentCustomer} onNavigate={setActivePage} />;
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
            <button
              aria-current={activePage === page.id ? "page" : undefined}
              key={page.id}
              onClick={() => setActivePage(page.id)}
            >
              {page.label}
            </button>
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
}: {
  initialCustomer?: CustomerProfile | null;
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

  async function loadCustomer(quiet = false) {
    try {
      const data = await readJson<{ customer: CustomerProfile }>(
        await fetch("/api/customer/me"),
      );
      setCustomer(data.customer);
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

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setState(`${action === "login" ? "Logging in" : "Registering"}...`);
    try {
      const response = await fetch(`/api/customer/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await readJson<{
        training?: boolean;
        customer: CustomerProfile;
      }>(response);
      await loadCustomer(true);
      setCustomer({ ...data.customer, addresses: data.customer.addresses ?? [] });
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
      setCustomer(null);
      setState("");
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
        >
          Login
        </button>
        <button
          className={`step ${action === "register" ? "on" : ""}`}
          disabled={submitting}
          onClick={() => setAction("register")}
        >
          Register
        </button>
      </div>
      <div className="form-grid">
        <input
          className="field wide"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
        />
        <input
          className="field wide"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
        />
        {action === "register" && (
          <>
            <input
              className="field"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="First name"
            />
            <input
              className="field"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Last name"
            />
          </>
        )}
      </div>
      <button className="button accent" disabled={submitting} onClick={submit}>
        {submitting
          ? action === "login"
            ? "Logging in…"
            : "Registering…"
          : `${action === "login" ? "Login customer" : "Register customer"} →`}
      </button>
      <p className="muted">{state}</p>
    </section>
  );
}
