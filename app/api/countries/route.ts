import { NextResponse } from "next/server";
import {
  loadStorefrontCountries,
  StorefrontCountriesUnavailable,
} from "@/lib/ct/storefront-countries";
export async function GET() {
  try {
    return NextResponse.json(
      { countries: await loadStorefrontCountries("b2c") },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Storefront countries are temporarily unavailable." },
      {
        status: error instanceof StorefrontCountriesUnavailable ? 503 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
