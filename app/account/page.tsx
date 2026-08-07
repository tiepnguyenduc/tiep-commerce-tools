import { AccountAuth } from "@/components/AccountAuth";
export default function Page() {
  return (
    <main className="shell account-page">
      <header className="page-head">
        <span className="eyebrow">Customer account</span>
        <h1>My Account</h1>
      </header>
      <AccountAuth />
    </main>
  );
}
