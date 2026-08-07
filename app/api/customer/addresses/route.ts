import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readCustomerProfile,
  removeCustomerAddress,
  upsertCustomerAddress,
} from "@/lib/ct/account";

const addressInput = z.object({
  id: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  streetName: z.string().optional(),
  streetNumber: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2).default("US"),
  phone: z.string().optional(),
});

export async function GET() {
  try {
    const customer = await readCustomerProfile();
    return NextResponse.json({ addresses: customer.addresses });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Address read failed" },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  const parsed = addressInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address input" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      customer: await upsertCustomerAddress(parsed.data),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Address update failed" },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const addressId = url.searchParams.get("id");
  if (!addressId) {
    return NextResponse.json({ error: "Address id is required" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      customer: await removeCustomerAddress(addressId),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Address remove failed" },
      { status: 502 },
    );
  }
}
