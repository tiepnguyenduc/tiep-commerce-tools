"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const request = useCallback(async (action?: B2BAction) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/b2b",
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
      setState(data);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect.");
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }, []);
  const reload = useCallback(async () => {
    await request();
  }, [request]);
  useEffect(() => {
    void reload();
  }, [reload]);
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
