import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnvReadiness } from "@/lib/env";
import { registerCustomer } from "@/lib/ct/customer";

const input = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration input" },
      { status: 400 },
    );
  }

  if (!getEnvReadiness().ready) {
    return NextResponse.json({
      training: true,
      customer: {
        id: "training-customer",
        email: parsed.data.email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      },
    });
  }

  try {
    return NextResponse.json({ customer: await registerCustomer(parsed.data) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Customer registration failed" },
      { status: 502 },
    );
  }
}
