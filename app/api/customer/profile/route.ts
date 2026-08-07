import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCustomerProfile } from "@/lib/ct/account";

const input = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function PATCH(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile input" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      customer: await updateCustomerProfile(parsed.data),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Profile update failed" },
      { status: 502 },
    );
  }
}
