"use client";

import CTSelect from "@/components/commercetools-ui/atoms/dropdown/default-dropdown";
import UIInput from "@/components/commercetools-ui/atoms/input";
import { useEffect, useId, useRef, useState } from "react";
import { findAddressLocationByPostalCode, getLinkedAddressOptions, hasPostalCodePrefix, isKnownPostalCode, syncPostalCode, syncLinkedAddressField, type LinkedAddressField } from "@/lib/address-directory";
import type { CustomerAddress } from "@/lib/types";

const fields: readonly {
  autoComplete: string;
  field: LinkedAddressField;
  placeholder: string;
}[] = [
  { field: "country", placeholder: "Country", autoComplete: "country" },
  { field: "region", placeholder: "State / Region", autoComplete: "address-level1" },
  { field: "city", placeholder: "City", autoComplete: "address-level2" },
];

const postalCodeError = "Postal code was not found in the supported locations.";

export function LinkedAddressFields({
  address,
  disabled = false,
  onChange,
}: {
  address: CustomerAddress;
  disabled?: boolean;
  onChange: (address: CustomerAddress) => void;
}) {
  const [postalCodeTouched, setPostalCodeTouched] = useState(false);
  const postalInputRef = useRef<HTMLInputElement>(null);
  const postalMessageId = useId();
  const postalCode = address.postalCode ?? "";
  const matchedLocation = findAddressLocationByPostalCode(postalCode);
  const postalCodeIsValid = Boolean(matchedLocation);
  const showPostalCodeError = Boolean(
    postalCode
      && !postalCodeIsValid
      && (postalCodeTouched || !hasPostalCodePrefix(postalCode)),
  );

  useEffect(() => {
    postalInputRef.current?.setCustomValidity(
      !postalCode || postalCodeIsValid ? "" : postalCodeError,
    );
  }, [postalCode, postalCodeIsValid]);

  return (
    <>
      {fields.map(({ autoComplete, field, placeholder }) => (
        <label className="select-field" key={field}>
          <span>{placeholder}</span>
          <CTSelect
            aria-label={placeholder}
            autoComplete={autoComplete}
            className="field"
            disabled={disabled}
            name={field}
            required
            value={address[field] ?? ""}
            onChange={(event) =>
              onChange(syncLinkedAddressField(address, field, event.target.value))
            }
          >
            <option value="">Select {placeholder.toLowerCase()}</option>
            {getLinkedAddressOptions(address, field).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CTSelect>
        </label>
      ))}
      <label className="select-field postal-code-field">
        <span>Postal code</span>
        <UIInput
          ref={postalInputRef}
          aria-describedby={postalMessageId}
          aria-invalid={showPostalCodeError}
          autoComplete="postal-code"

          disabled={disabled}
          maxLength={16}
          name="postalCode"
          placeholder="Enter postal code"
          required
          value={postalCode}
          onBlur={() => setPostalCodeTouched(true)}
          onChange={(event) => {
            const value = event.currentTarget.value.toUpperCase();
            const valid = !value || isKnownPostalCode(value);
            event.currentTarget.setCustomValidity(valid ? "" : postalCodeError);
            setPostalCodeTouched(Boolean(value) && !hasPostalCodePrefix(value));
            onChange(syncPostalCode(address, value));
          }}
          onInvalid={() => setPostalCodeTouched(true)}
        />
        <small
          className={showPostalCodeError ? "field-message error" : "field-message"}
          id={postalMessageId}
          role={showPostalCodeError ? "alert" : undefined}
        >
          {showPostalCodeError
            ? postalCodeError
            : matchedLocation
              ? `Matched: ${matchedLocation.city}, ${matchedLocation.region}, ${matchedLocation.country}.`
              : "Enter a postal code to update Country, State / Region, and City."}
        </small>
      </label>
      <p className="address-link-hint wide">
        Select a location or enter a postal code. All four fields stay matched
        automatically.
      </p>
    </>
  );
}
