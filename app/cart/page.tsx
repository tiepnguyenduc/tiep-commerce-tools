import { CartView } from "@/components/CartView";
export default function Page() {
  return (
    <main className="shell">
      <header className="page-head">
        <span className="eyebrow">Your selection</span>
        <h1>Build the room.</h1>
      </header>
      <CartView />
    </main>
  );
}
