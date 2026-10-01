"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useStorefrontLanguages } from "./useStorefrontLanguages";
import germanMessages from "@/lib/launchpad/messages/de.json";
import englishMessages from "@/lib/launchpad/messages/en.json";
import "@/lib/launchpad/ui.css";

/** Presentation context only. Studio, account and Algolia providers are opt-in. */
export default function LaunchpadUIProvider({
  children,
  locale,
  messages,
  timeZone = "UTC",
  resetStyles = true,
}: {
  children: ReactNode;
  locale?: string;
  messages?: AbstractIntlMessages;
  timeZone?: string;
  resetStyles?: boolean;
}) {
  const pathname = usePathname();
  const storefront = pathname === "/b2b" || pathname?.startsWith("/b2b/") ? "b2b" : "b2c";
  const language = useStorefrontLanguages(storefront);
  const activeLocale = locale ?? language.locale ?? "en";
  const activeMessages = messages ?? (activeLocale.split("-")[0] === "de" ? germanMessages : englishMessages);
  useEffect(() => { document.documentElement.lang = activeLocale; }, [activeLocale]);
  return (
    <NextIntlClientProvider locale={activeLocale} messages={activeMessages} timeZone={timeZone}>
      <div className={resetStyles ? "launchpad-ui" : undefined} data-theme="default">{children}</div>
    </NextIntlClientProvider>
  );
}
