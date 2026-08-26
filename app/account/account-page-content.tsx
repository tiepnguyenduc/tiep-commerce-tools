import { AccountAuth } from "@/components/AccountAuth";
import { readCustomerProfile } from "@/lib/ct/account";
import type { AccountPage } from "@/lib/account-pages";
import type {
  CustomerOrderDetail,
  CustomerProfile,
} from "@/lib/types";

async function readInitialCustomer(): Promise<CustomerProfile | null> {
  try {
    return await readCustomerProfile();
  } catch {
    return null;
  }
}

export async function AccountPageContent({
  initialPage = "dashboard",
}: {
  initialPage?: AccountPage;
}) {
  const customer = await readInitialCustomer();
  return AccountPageView({ customer, initialPage });
}

export function AccountPageView({
  customer,
  initialOrder,
  initialPage = "dashboard",
}: {
  customer: CustomerProfile | null;
  initialOrder?: CustomerOrderDetail;
  initialPage?: AccountPage;
}) {
  return (
    <main className="shell account-page">
      <header className="page-head">
        <span className="eyebrow">Customer account</span>
        <h1>My Account</h1>
      </header>
      <AccountAuth
        initialCustomer={customer}
        initialOrder={initialOrder}
        initialPage={initialPage}
      />
    </main>
  );
}
