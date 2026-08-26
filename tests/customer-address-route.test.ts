import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertCustomerAddress = vi.hoisted(() => vi.fn());

vi.mock("../lib/ct/account", () => ({
  readCustomerProfile: vi.fn(),
  removeCustomerAddress: vi.fn(),
  upsertCustomerAddress,
}));

import { PATCH } from "../app/api/customer/addresses/route";

const validAddress = {
  firstName: "Tiep",
  lastName: "Nguyen",
  streetName: "Dancing Cloud Ct",
  streetNumber: "4075",
  city: "Destin",
  region: "Florida",
  postalCode: "32541",
  country: "US",
};

function patchAddress(body: object) {
  return PATCH(new Request("http://localhost/api/customer/addresses", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("customer address route", () => {
  beforeEach(() => {
    upsertCustomerAddress.mockReset();
  });

  it("accepts a supported, matching postal code", async () => {
    upsertCustomerAddress.mockResolvedValue({ id: "customer-1", addresses: [] });

    const response = await patchAddress(validAddress);

    expect(response.status).toBe(200);
    expect(upsertCustomerAddress).toHaveBeenCalledWith(validAddress);
  });

  it("normalizes postal code formatting before saving", async () => {
    upsertCustomerAddress.mockResolvedValue({ id: "customer-1", addresses: [] });
    const canadianAddress = {
      ...validAddress,
      country: "CA",
      region: "Ontario",
      city: "Toronto",
      postalCode: "m5h2n2",
    };

    const response = await patchAddress(canadianAddress);

    expect(response.status).toBe(200);
    expect(upsertCustomerAddress).toHaveBeenCalledWith({
      ...canadianAddress,
      postalCode: "M5H 2N2",
    });
  });

  it("rejects a postal code that does not exist in the directory", async () => {
    const response = await patchAddress({ ...validAddress, postalCode: "99999" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Postal code was not found in the supported locations.",
    });
    expect(upsertCustomerAddress).not.toHaveBeenCalled();
  });

  it("rejects location fields that do not match the postal code", async () => {
    const response = await patchAddress({ ...validAddress, city: "Miami" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "City, state/region, and country must match the postal code.",
    });
    expect(upsertCustomerAddress).not.toHaveBeenCalled();
  });
});
