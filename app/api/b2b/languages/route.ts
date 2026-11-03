import { NextResponse } from "next/server";
import {
  loadStorefrontLanguages,
  StorefrontLanguagesUnavailable,
} from "@/lib/ct/storefront-languages";
export async function GET() {
  try {
    return NextResponse.json(
      { languages: await loadStorefrontLanguages("b2b") },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Business languages are temporarily unavailable." },
      {
        status: error instanceof StorefrontLanguagesUnavailable ? 503 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
