import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCustomerPassword } from "@/lib/ct/account";

const input = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function PATCH(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid password input" }, { status: 400 });
  }

  try {
    return NextResponse.json(await updateCustomerPassword(parsed.data));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Password update failed" },
      { status: 502 },
    );
  }
}
