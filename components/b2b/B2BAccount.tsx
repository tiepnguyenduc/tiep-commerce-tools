"use client";
import { useB2BTranslations } from "./useB2BTranslations";
import { useState } from "react";
import Link from "next/link";
import Button from "@/components/commercetools-ui/atoms/button";
import Input from "@/components/commercetools-ui/atoms/input";
import { useToast } from "@/components/Toast";
import { useB2B } from "./B2BProvider";
import s from "./B2B.module.css";
export function B2BAccount({ embedded = false }: { embedded?: boolean }) {
  const { t } = useB2BTranslations();
  const Container = embedded ? "div" : "main";
  const { state, busy, act } = useB2B();
  const [register, setRegister] = useState(false);
  const showToast = useToast();
  const [managedUnit, setManagedUnit] = useState("");
  const unit =
    state?.businessUnits.find(
      (u) => u.key === (managedUnit || state.context?.businessUnitKey),
    ) ?? state?.businessUnits[0];
  return (
    <Container className={embedded ? undefined : s.main}>
      {!embedded && (
        <div className={s.pageTitle}>
          <span className={s.eyebrow}>YOUR BUSINESS WORKSPACE</span>
          <h1>
            {state?.customer
              ? "A place for your business."
              : t("Better together.")}
          </h1>
          <p>
            {state?.customer
              ? "Manage your company and the people who purchase with you."
              : t(
                  "Your account connects your team, stores and business pricing.",
                )}
          </p>
        </div>
      )}
      <nav className={s.accountToolLinks} aria-label="Business shopping tools">
        <Link href="/b2b/quick-order">Quick order by SKU →</Link>
        <Link href="/b2b/wishlist">My Wishlist →</Link>
        <Link href="/b2b/compare">Compare equipment →</Link>
        <Link href="/b2b/categories">Browse categories →</Link>
      </nav>
      {!state ? (
        <p className={s.empty}>Loading your account…</p>
      ) : !state.customer ? (
        <div className={s.accountGrid}>
          <section className={s.panel}>
            <div className={s.tabs}>
              <button
                aria-pressed={!register}
                onClick={() => setRegister(false)}
              >
                {t("Sign in")}
              </button>
              <button aria-pressed={register} onClick={() => setRegister(true)}>
                {t("Create account")}
              </button>
            </div>
            <h2>
              {register ? t("Start your business account") : t("Welcome back")}
            </h2>
            <p>
              {register
                ? "Create an account, then set up your company or ask its administrator to add you."
                : "Sign in to access your business units and store pricing."}
            </p>
            <form
              className={s.form}
              onSubmit={async (e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                await act({
                  action: register ? "register" : "login",
                  email: String(d.get("email")),
                  password: String(d.get("password")),
                  firstName: String(d.get("firstName") || ""),
                  lastName: String(d.get("lastName") || ""),
                });
              }}
            >
              {register && (
                <div className={s.twoColumns}>
                  <Input
                    label={t("First name")}
                    name="firstName"
                    autoComplete="given-name"
                    required
                  />
                  <Input
                    label={t("Last name")}
                    name="lastName"
                    autoComplete="family-name"
                    required
                  />
                </div>
              )}
              <Input
                label={t("Work email")}
                type="email"
                name="email"
                autoComplete="email"
                required
              />
              <Input
                label={t("Password")}
                type="password"
                name="password"
                minLength={register ? 8 : 1}
                autoComplete={register ? "new-password" : "current-password"}
                required
              />
              <Button className={s.button} loading={busy} type="submit">
                {register ? t("Create account") : t("Sign in")}
              </Button>
            </form>
          </section>
          <aside className={s.accountAside}>
            <span className={s.eyebrow}>PURCHASING, WITH PURPOSE</span>
            <h2>
              One account.
              <br />
              Your whole business.
            </h2>
            <ol>
              <li>
                <strong>Make it yours</strong>
                <p>Create your personal business account.</p>
              </li>
              <li>
                <strong>Bring your team together</strong>
                <p>
                  Create a company or have an administrator assign you to an
                  existing business unit.
                </p>
              </li>
              <li>
                <strong>Shop in context</strong>
                <p>
                  Select an assigned store to browse its assortment and prices.
                </p>
              </li>
            </ol>
          </aside>
        </div>
      ) : (
        <div className={s.accountGrid}>
          <section className={s.panel}>
            <span className={s.eyebrow}>ACCOUNT DETAILS</span>
            <h2>
              {state.customer.firstName} {state.customer.lastName}
            </h2>
            <p>{state.customer.email}</p>
            <Button
              variant="underlined"
              disabled={busy}
              onClick={() => void act({ action: "logout" })}
            >
              Sign out
            </Button>
            <hr />
            <h2>Your business units</h2>
            {state.businessUnits.length ? (
              state.businessUnits.map((u) => (
                <div className={s.unitRow} key={u.key}>
                  <strong>{u.name}</strong>
                  <span>
                    {u.stores.length} assigned{" "}
                    {u.stores.length === 1 ? "store" : "stores"}
                  </span>
                  {!u.stores.length && (
                    <p>
                      Your company is ready. Contact the store administrator to
                      assign a store before you can purchase.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p>
                You are not assigned to a business unit yet. Create a company
                below, or ask your company administrator to add your email.
              </p>
            )}
            {!state.businessUnits.length && (
              <>
                <hr />
                <h3>Create a company</h3>
                <p>
                  You will become its administrator. A store administrator must
                  assign your company’s stores.
                </p>
                <form
                  className={s.form}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    const d = new FormData(f);
                    if (
                      await act({
                        action: "create-business-unit",
                        name: String(d.get("name")),
                      })
                    ) {
                      showToast(
                        "Company created. Your business is ready for store assignment.",
                        "success",
                      );
                      f.reset();
                    }
                  }}
                >
                  <Input label="Company name" name="name" required />
                  <Button className={s.button} loading={busy}>
                    Create company
                  </Button>
                </form>
              </>
            )}
          </section>
          <aside className={s.panel}>
            <span className={s.eyebrow}>YOUR TEAM</span>
            <h2>Purchase together.</h2>
            {state.businessUnits.length > 0 && (
              <label className={s.field}>
                Business unit
                <select
                  value={unit?.key || ""}
                  onChange={(e) => setManagedUnit(e.target.value)}
                >
                  {state.businessUnits.map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {unit?.canManageAssociates ? (
              <>
                <p>
                  Add an existing account to <strong>{unit.name}</strong>. They
                  will be able to purchase for this business unit.
                </p>
                <form
                  className={s.form}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    const d = new FormData(f);
                    if (
                      await act({
                        action: "add-associate",
                        businessUnitKey: unit.key,
                        email: String(d.get("email")),
                      })
                    ) {
                      showToast(
                        "The account has been assigned to your business unit.",
                        "success",
                      );
                      f.reset();
                    }
                  }}
                >
                  <Input
                    name="email"
                    type="email"
                    label="Team member’s account email"
                    required
                  />
                  <Button className={s.button} loading={busy}>
                    Add team member
                  </Button>
                </form>
              </>
            ) : (
              <p>
                {state.context
                  ? "Your business administrator can assign accounts to this business unit."
                  : "Create a company or select a business unit to manage team access. Only authorized administrators can add members."}
              </p>
            )}
            <hr />
            <h3>Your purchasing context</h3>
            <p>
              {state.context
                ? `${unit?.name} · ${state.context.storeKey} · ${state.context.currency}`
                : "No store selected yet."}
            </p>
            <Link className={s.textLink} href="/b2b/products">
              Explore the catalog →
            </Link>
          </aside>
        </div>
      )}
    </Container>
  );
}
