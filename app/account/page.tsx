import { getEnvReadiness } from "@/lib/env";
import { AccountAuth } from "@/components/AccountAuth";
export default function Page() {
  const env = getEnvReadiness();
  return (
    <main className="shell">
      <header className="page-head">
        <span className="eyebrow">Customer & associate workspace</span>
        <h1>Good morning, Alex.</h1>
      </header>
      <div className="account-grid">
        <aside className="panel dark">
          <span className="eyebrow">Environment</span>
          <p className="metric">{env.mode === "training" ? "Mock" : "Live"}</p>
          <p>
            {env.ready
              ? "Connected to commercetools."
              : `Training mode: ${env.missing.length} credential fields missing.`}
          </p>
        </aside>
        <section className="panel">
          <h2>Account training dashboard</h2>
          <div className="grid">
            <div>
              <span className="eyebrow">Recent orders</span>
              <p className="metric">03</p>
            </div>
            <div>
              <span className="eyebrow">Open approvals</span>
              <p className="metric">01</p>
            </div>
            <div>
              <span className="eyebrow">Business unit</span>
              <h3>Northstar Design Group</h3>
            </div>
          </div>
          <div className="notice">
            In production, authentication, customer details, orders,
            permissions, and Business Unit context are loaded through protected
            BFF endpoints.
          </div>
        </section>
        <AccountAuth />
      </div>
    </main>
  );
}
