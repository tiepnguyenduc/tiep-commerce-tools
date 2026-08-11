import { AccountAuth } from "@/components/AccountAuth";
import { readCustomerProfile } from "@/lib/ct/account";
import type { CustomerProfile } from "@/lib/types";

// The session lives on the server, so this page must render per request —
// otherwise a prerendered login form is served to signed-in customers.
export const dynamic = "force-dynamic";

async function readInitialCustomer(): Promise<CustomerProfile | null> {
  try {
    return await readCustomerProfile();
  } catch {
    return null;
  }
}

export default async function Page() {
  const customer = await readInitialCustomer();
  return (
    <main className="shell account-page">
      <header className="page-head">
        <span className="eyebrow">Customer account</span>
        <h1>My Account</h1>
      </header>
      <AccountAuth initialCustomer={customer} />
    </main>
  );
}
