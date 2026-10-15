"use client";
import { useRef, useState } from "react";
import useSWR from "swr";
import { useToast } from "@/components/Toast";
import { useB2B } from "./B2BProvider";
import type { B2BAccountProfile } from "@/lib/b2b/account-types";
export function useB2BAccountProfile() {
  const { state, reload } = useB2B();
  const customerId = state?.customer?.id;
  const currentCustomer = useRef(customerId);
  currentCustomer.current = customerId;
  const { data, error, isLoading, mutate } = useSWR<{
    profile: B2BAccountProfile;
  }>(
    customerId ? ["/api/b2b/account", customerId] : null,
    async ([url]: [string, string]) => {
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to load your account.");
      return result;
    },
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  const [busy, setBusy] = useState(false);
  const showToast = useToast();
  const lock = useRef(false);
  async function submit(
    body: Record<string, unknown>,
    success: string,
    method: "PATCH" | "DELETE" = "PATCH",
  ) {
    if (lock.current || !customerId) return false;
    lock.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/b2b/account", {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            "The change could not be completed. Please try again.",
        );
      if (currentCustomer.current !== customerId) return false;
      if (method === "DELETE" || result.signedOut) {
        await mutate(undefined, { revalidate: false });
        if (method === "DELETE") {
          try {
            for (const key of Object.keys(localStorage)) {
              if (
                (key.startsWith("b2b-saved:") ||
                  key.startsWith("b2b-compare:")) &&
                JSON.parse(key.slice(key.indexOf(":") + 1))[0] === customerId
              )
                localStorage.removeItem(key);
            }
          } catch {
            /* Storage is optional. */
          }
        }
        window.location.assign("/b2b/account");
        return true;
      }
      await mutate(result, { revalidate: false });
      await reload();
      showToast(success, "success");
      return true;
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "The change could not be completed.",
        "error",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    profile: data?.profile,
    loading: isLoading,
    error: error?.message as string | undefined,
    busy,
    submit,
    retry: () => {
      void mutate();
    },
  };
}
