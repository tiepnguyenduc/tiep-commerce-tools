import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addressMatchesPostalCode,
  findAddressLocationByPostalCode,
  syncPostalCode,
} from "@/lib/address-directory";
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
  city: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2),
  phone: z.string().optional(),
}).superRefine((address, context) => {
  if (!findAddressLocationByPostalCode(address.postalCode)) {
    context.addIssue({
      code: "custom",
      message: "Postal code was not found in the supported locations.",
      path: ["postalCode"],
    });
    return;
  }
  if (!addressMatchesPostalCode(address)) {
    context.addIssue({
      code: "custom",
      message: "City, state/region, and country must match the postal code.",
      path: ["postalCode"],
    });
  }
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid address input" },
      { status: 400 },
    );
  }

  try {
    const normalizedAddress = syncPostalCode(
      parsed.data,
      parsed.data.postalCode,
    );
    return NextResponse.json({
      customer: await upsertCustomerAddress(normalizedAddress),
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
