import { CheckoutForm } from "@/components/CheckoutForm";
export default function Page() {
  return (
    <main className="shell">
      <header className="page-head">
        <h1>Checkout, without friction.</h1>
      </header>
      <CheckoutForm mode="b2c" />
    </main>
  );
}
