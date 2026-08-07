import { NextResponse } from "next/server";
import { readCustomerProfile } from "@/lib/ct/account";

export async function GET() {
  try {
    return NextResponse.json({ customer: await readCustomerProfile() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Customer read failed" },
      { status: 401 },
    );
  }
}
