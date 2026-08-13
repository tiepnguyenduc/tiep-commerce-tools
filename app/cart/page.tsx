import { CartView } from "@/components/CartView";
export default function Page() {
  return (
    <main className="shell">
      <header className="page-head">
        <h1>Cart page</h1>
      </header>
      <CartView />
    </main>
  );
}
