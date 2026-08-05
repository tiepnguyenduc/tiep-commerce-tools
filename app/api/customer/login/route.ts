import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnvReadiness } from "@/lib/env";
import { loginCustomer } from "@/lib/ct/customer";

const input = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login input" }, { status: 400 });
  }

  if (!getEnvReadiness().ready) {
    return NextResponse.json({
      training: true,
      customer: { id: "training-customer", email: parsed.data.email },
    });
  }

  try {
    return NextResponse.json({ customer: await loginCustomer(parsed.data) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Customer login failed" },
      { status: 502 },
    );
  }
}
