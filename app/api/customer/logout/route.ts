import { NextResponse } from "next/server";
import { logoutCustomer } from "@/lib/ct/account";

export async function POST() {
  logoutCustomer();
  return NextResponse.json({ loggedOut: true });
}
