"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import type { ReactNode } from "react";
import englishMessages from "@/lib/launchpad/messages/en.json";
import "@/lib/launchpad/ui.css";

/** Presentation context only. Studio, account and Algolia providers are opt-in. */
export default function LaunchpadUIProvider({
  children,
  locale = "en",
  messages = englishMessages,
  timeZone = "UTC",
  resetStyles = true,
}: {
  children: ReactNode;
  locale?: string;
  messages?: AbstractIntlMessages;
  timeZone?: string;
  resetStyles?: boolean;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <div className={resetStyles ? "launchpad-ui" : undefined} data-theme="default">{children}</div>
    </NextIntlClientProvider>
  );
}
