import { describe, expect, it } from "vitest";
import {
  addressMatchesPostalCode,
  findAddressLocationByPostalCode,
  getLinkedAddressOptions,
  hasPostalCodePrefix,
  isKnownPostalCode,
  syncPostalCode,
  syncLinkedAddressField,
} from "../lib/address-directory";

describe("linked address directory", () => {
  it("completes an address when a postal code is selected first", () => {
    expect(
      syncLinkedAddressField({ country: "" }, "postalCode", "32541"),
    ).toMatchObject({
      country: "US",
      region: "Florida",
      city: "Destin",
      postalCode: "32541",
    });
  });

  it("normalizes an editable postal code and completes its location", () => {
    const previousAddress = {
      country: "US",
      region: "California",
      city: "San Francisco",
      postalCode: "94105",
    };

    expect(syncPostalCode(previousAddress, "m5h2n2")).toMatchObject({
      country: "CA",
      region: "Ontario",
      city: "Toronto",
      postalCode: "M5H 2N2",
    });
  });

  it("detects incomplete and unknown postal codes", () => {
    expect(hasPostalCodePrefix("325")).toBe(true);
    expect(isKnownPostalCode("325")).toBe(false);
    expect(hasPostalCodePrefix("99999")).toBe(false);
    expect(findAddressLocationByPostalCode("99999")).toBeUndefined();
  });

  it("validates that the other address fields match the postal code", () => {
    const address = syncPostalCode({ country: "" }, "32541");
    expect(addressMatchesPostalCode(address)).toBe(true);
    expect(addressMatchesPostalCode({ ...address, city: "Miami" })).toBe(false);
  });

  it("keeps every linked field in sync when the region changes", () => {
    const original = syncLinkedAddressField(
      { country: "" },
      "postalCode",
      "94105",
    );

    expect(syncLinkedAddressField(original, "region", "Florida")).toMatchObject({
      country: "US",
      region: "Florida",
      city: "Destin",
      postalCode: "32541",
    });
  });

  it("filters cities to the selected country and region", () => {
    const options = getLinkedAddressOptions(
      { country: "US", region: "Florida" },
      "city",
    );

    expect(options.map((option) => option.value)).toEqual([
      "Destin",
      "Miami",
      "Orlando",
    ]);
  });

  it("still offers other countries and regions after an address is complete", () => {
    const address = syncLinkedAddressField(
      { country: "" },
      "postalCode",
      "94105",
    );

    expect(
      getLinkedAddressOptions(address, "country").map((option) => option.value),
    ).toContain("VN");
    expect(
      getLinkedAddressOptions(address, "region").map((option) => option.value),
    ).toContain("Florida");
  });

  it("clears dependent fields when a parent selection is cleared", () => {
    const address = syncLinkedAddressField(
      { country: "" },
      "postalCode",
      "32541",
    );

    expect(syncLinkedAddressField(address, "region", "")).toMatchObject({
      country: "US",
      region: "",
      city: "",
      postalCode: "",
    });
  });

  it("preserves a saved value that is not in the directory", () => {
    const options = getLinkedAddressOptions(
      {
        country: "US",
        region: "Florida",
        city: "Pensacola",
        postalCode: "32502",
      },
      "city",
    );

    expect(options[0]).toEqual({ value: "Pensacola", label: "Pensacola (saved)" });
  });
});
