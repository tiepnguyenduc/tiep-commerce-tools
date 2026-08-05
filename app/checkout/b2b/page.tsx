import { CheckoutForm } from "@/components/CheckoutForm";
export default function Page() {
  return (
    <main className="shell">
      <header className="page-head">
        <h1>Ready for review.</h1>
      </header>
      <CheckoutForm mode="b2b" />
    </main>
  );
}
