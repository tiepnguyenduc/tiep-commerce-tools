import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/ct/catalog";
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.json(
    await searchProducts(
      url.searchParams.get("q") ?? "",
      url.searchParams.get("category") ?? "",
      {
        color: url.searchParams.get("color") ?? "",
        price: url.searchParams.get("price") ?? "",
        sort: url.searchParams.get("sort") ?? "",
      },
    ),
  );
}
