import type { StoreMode } from "@/lib/types";
import { CheckoutDemo } from "./CheckoutDemo";

export function CheckoutForm({ mode }: { mode: StoreMode }) {
  return <CheckoutDemo mode={mode} />;
}
