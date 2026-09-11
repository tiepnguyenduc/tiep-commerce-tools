import { isCompareProductData, type CompareProductData } from "@/components/ProductCompareData";

export const compareChangeEvent = "launchpad-compare-products";
let customerId: string | null = null;
const storageKey = () => customerId ? `${compareChangeEvent}:${customerId}` : compareChangeEvent;

export function setCompareCustomer(id: string | null) {
  customerId = id;
  if (typeof window === "undefined") return;
  // Adopt the guest selection only on the first sign-in for this account.
  try {
    if (id && window.localStorage.getItem(storageKey()) === null) {
      const guest = window.localStorage.getItem(compareChangeEvent);
      if (guest) {
        window.localStorage.setItem(storageKey(), guest);
        window.localStorage.removeItem(compareChangeEvent);
      }
    }
  } catch {
    // Storage may be unavailable in private browsing.
  }
  window.dispatchEvent(new Event(compareChangeEvent));
}

export function readCompareProducts(): CompareProductData[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey()) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isCompareProductData) : [];
  } catch { return []; }
}

export function writeCompareProducts(products: CompareProductData[]) {
  window.localStorage.setItem(storageKey(), JSON.stringify(products));
  window.dispatchEvent(new Event(compareChangeEvent));
}
