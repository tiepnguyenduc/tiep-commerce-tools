import { NextResponse } from "next/server";
import { z } from "zod";
import { getB2BReadiness, getEnvReadiness } from "@/lib/env";
import {
  clearTrainingCart,
  readTrainingCart,
  writeTrainingCart,
} from "@/lib/training-store";
import { clearLiveCart, readLiveCart, updateLiveCart } from "@/lib/ct/cart";
import { getCartId } from "@/lib/ct/session";

const input = z.object({
  productId: z.string(),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).max(99),
  mode: z.enum(["b2c", "b2b"]).optional(),
});

const clearInput = z.object({
  mode: z.enum(["b2c", "b2b"]).optional(),
});

async function requestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const env = getEnvReadiness();
  const url = new URL(request.url);
  const requestedMode = url.searchParams.get("mode");
  const mode =
    requestedMode === "b2b" || requestedMode === "b2c"
      ? requestedMode
      : getCartId("b2b")
        ? "b2b"
        : "b2c";

  if (!env.ready) return NextResponse.json(readTrainingCart());
  if (mode === "b2b" && !getB2BReadiness().ready) {
    return NextResponse.json(
      { error: "B2B associate context is not configured." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json((await readLiveCart(mode)) ?? readTrainingCart());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cart read failed" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const parsed = input.safeParse(await requestBody(request));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid cart update" }, { status: 400 });
  try {
    const env = getEnvReadiness();
    const mode = parsed.data.mode ?? "b2c";
    if (env.ready) {
      if (mode === "b2b" && !getB2BReadiness().ready) {
        return NextResponse.json(
          { error: "B2B associate context is not configured." },
          { status: 400 },
        );
      }
      return NextResponse.json(await updateLiveCart({ ...parsed.data, mode }));
    }

    return NextResponse.json(
      writeTrainingCart(
        parsed.data.productId,
        parsed.data.quantity,
        mode,
      ),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cart update failed" },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const parsed = clearInput.safeParse(await requestBody(request));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid cart clear request" },
      { status: 400 },
    );

  try {
    const env = getEnvReadiness();
    const mode = parsed.data.mode ?? "b2c";
    if (env.ready) {
      if (mode === "b2b" && !getB2BReadiness().ready) {
        return NextResponse.json(
          { error: "B2B associate context is not configured." },
          { status: 400 },
        );
      }
      return NextResponse.json(await clearLiveCart(mode));
    }

    return NextResponse.json(clearTrainingCart(mode));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cart clear failed" },
      { status: 502 },
    );
  }
}
