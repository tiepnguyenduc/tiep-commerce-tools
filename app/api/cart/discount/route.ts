import { NextResponse } from "next/server";
import { discountApplyInput, discountRemoveInput } from "@/lib/cart-discount";
import { getB2BReadiness, getEnvReadiness } from "@/lib/env";
import { applyLiveDiscountCode, removeLiveDiscountCode } from "@/lib/ct/cart";
import { getCartId } from "@/lib/ct/session";
import type { StoreMode } from "@/lib/types";

function validationError(message = "Invalid discount request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

function readinessError(mode: StoreMode) {
  if (!getEnvReadiness().ready) {
    return validationError(
      "Connect commercetools to apply discount codes from Merchant Center.",
    );
  }
  if (mode === "b2b" && !getB2BReadiness().ready) {
    return validationError("B2B associate context is not configured.");
  }
  if (!getCartId(mode)) {
    return validationError(
      "No active cart. Add an item before applying a discount code.",
    );
  }
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Discount update failed";
  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;
  const status =
    statusCode && statusCode >= 400 && statusCode < 500 ? 400 : 502;
  return NextResponse.json({ error: message }, { status });
}

async function requestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const parsed = discountApplyInput.safeParse(await requestBody(request));
  if (!parsed.success) return validationError("Enter a valid discount code.");

  const notReady = readinessError(parsed.data.mode);
  if (notReady) return notReady;

  try {
    return NextResponse.json(
      await applyLiveDiscountCode(parsed.data.mode, parsed.data.code),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const parsed = discountRemoveInput.safeParse(await requestBody(request));
  if (!parsed.success) return validationError();

  const notReady = readinessError(parsed.data.mode);
  if (notReady) return notReady;

  try {
    return NextResponse.json(
      await removeLiveDiscountCode(
        parsed.data.mode,
        parsed.data.discountCodeId,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
