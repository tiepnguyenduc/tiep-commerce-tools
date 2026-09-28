import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  b2bAction: vi.fn(),
  b2bState: vi.fn(),
  readB2BSession: vi.fn(),
  writeB2BSession: vi.fn(),
  sealSession: vi.fn(),
}));
vi.mock("../lib/ct/b2b", () => ({
  b2bAction: mocks.b2bAction,
  b2bState: mocks.b2bState,
  B2BError: class extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
}));
vi.mock("../lib/b2b/session", () => ({
  readB2BSession: mocks.readB2BSession,
  writeB2BSession: mocks.writeB2BSession,
  sealSession: mocks.sealSession,
}));
import { POST } from "../app/api/b2b/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.readB2BSession.mockResolvedValue({});
});
it("rejects cross-origin writes before reading a session or calling commerce", async () => {
  const response = await POST(
    new NextRequest("https://shop.test/api/b2b", {
      method: "POST",
      headers: {
        origin: "https://other.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "create-business-unit", name: "Company" }),
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.readB2BSession).not.toHaveBeenCalled();
  expect(mocks.b2bAction).not.toHaveBeenCalled();
});
it("rejects invalid quantities before performing a cart write", async () => {
  const response = await POST(
    new NextRequest("https://shop.test/api/b2b", {
      method: "POST",
      headers: {
        origin: "https://shop.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "add-to-cart",
        productId: "f4f7f0a4-ab56-4b5c-81de-95503be9c1e3",
        variantId: 1,
        quantity: -1,
      }),
    }),
  );
  expect(response.status).toBe(400);
  expect(mocks.b2bAction).not.toHaveBeenCalled();
});

it("explains missing associate permissions without exposing customer identifiers", async () => {
  mocks.b2bAction.mockRejectedValueOnce({
    statusCode: 400,
    body: { errors: [{ code: "AssociateMissingPermission", message: "Customer private-id needs CreateMyCarts" }] },
  });
  const response = await POST(new NextRequest("https://shop.test/api/b2b", {
    method: "POST",
    headers: { origin: "https://shop.test", "content-type": "application/json" },
    body: JSON.stringify({
      action: "add-to-cart",
      productId: "f4f7f0a4-ab56-4b5c-81de-95503be9c1e3",
      variantId: 1,
      quantity: 1,
    }),
  }));
  expect(response.status).toBe(403);
  const body = await response.json();
  expect(body.error).toContain("buyer role");
  expect(body.error).not.toContain("private-id");
  expect(mocks.writeB2BSession).not.toHaveBeenCalled();
});
