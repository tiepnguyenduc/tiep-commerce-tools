import { NextResponse } from "next/server";
import { B2BNavigationUnavailable, loadB2BNavigation } from "@/lib/ct/b2b-navigation";

export async function GET(request: Request) {
  const requestedLocale = new URL(request.url).searchParams.get("locale");
  const locale = requestedLocale === "de" || requestedLocale === "de-DE" ? "de-DE"
    : requestedLocale === "en" || requestedLocale === "en-US" ? "en-US" : undefined;
  try {
    return NextResponse.json({ categories: await loadB2BNavigation(locale) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Business navigation is temporarily unavailable." }, {
      status: error instanceof B2BNavigationUnavailable ? 503 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
