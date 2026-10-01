"use client";
import { useStorefrontLanguages } from "../useStorefrontLanguages";
import { translateBusiness } from "@/lib/b2b/translations";
export function useB2BTranslations() {
  const { locale } = useStorefrontLanguages("b2b");
  return {
    locale: locale || "en",
    t: (text: string, values?: Record<string, string | number>) =>
      translateBusiness(locale, text, values),
  };
}
