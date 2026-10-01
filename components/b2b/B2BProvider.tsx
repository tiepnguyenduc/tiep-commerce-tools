"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStorefrontLanguages } from "@/components/useStorefrontLanguages";
import type { B2BAction, B2BState } from "@/lib/b2b/types";
const Context = createContext<{
  state: B2BState | null;
  busy: boolean;
  error: string;
  reload: () => Promise<void>;
  act: (action: B2BAction) => Promise<boolean>;
} | null>(null);
export function B2BProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<B2BState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const pendingReload = useRef(false);
  const { locale } = useStorefrontLanguages("b2b");
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const request = useCallback(async function run(
    action?: B2BAction,
  ): Promise<boolean> {
    if (lock.current) {
      if (!action) pendingReload.current = true;
      return false;
    }
    const requestedLocale = localeRef.current;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/b2b${requestedLocale ? `?locale=${encodeURIComponent(requestedLocale)}` : ""}`,
        action
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action),
            }
          : { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to connect. Please try again.");
      if (requestedLocale === localeRef.current) setState(data);
      return true;
    } catch (e) {
      if (requestedLocale === localeRef.current)
        setError(e instanceof Error ? e.message : "Unable to connect.");
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
      if (pendingReload.current || requestedLocale !== localeRef.current) {
        pendingReload.current = false;
        void run(); // Refresh only; never replay a mutation after changing language.
      }
    }
  }, []);
  const reload = useCallback(async () => {
    await request();
  }, [request]);
  useEffect(() => {
    void reload();
  }, [reload, locale]);
  return (
    <Context.Provider value={{ state, busy, error, reload, act: request }}>
      {children}
    </Context.Provider>
  );
}
export function useB2B() {
  const value = useContext(Context);
  if (!value) throw new Error("B2BProvider required");
  return value;
}
