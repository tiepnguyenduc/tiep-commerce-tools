import type { CustomerAddress } from "./types";

export type AddressLocation = {
  country: string;
  countryName: string;
  region: string;
  city: string;
  postalCode: string;
};

export type LinkedAddressField = "country" | "region" | "city" | "postalCode";

export type AddressOption = {
  label: string;
  value: string;
};

function postalCodeKey(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

// Address fields in commercetools are free-form strings. Keep the storefront's
// supported combinations here so the client can offer deterministic, linked
// choices without sending customer data to a third-party geocoder.
export const addressLocations: readonly AddressLocation[] = [
  { country: "US", countryName: "United States", region: "California", city: "Los Angeles", postalCode: "90001" },
  { country: "US", countryName: "United States", region: "California", city: "San Diego", postalCode: "92101" },
  { country: "US", countryName: "United States", region: "California", city: "San Francisco", postalCode: "94105" },
  { country: "US", countryName: "United States", region: "California", city: "San Francisco", postalCode: "94107" },
  { country: "US", countryName: "United States", region: "District of Columbia", city: "Washington", postalCode: "20001" },
  { country: "US", countryName: "United States", region: "Florida", city: "Destin", postalCode: "32541" },
  { country: "US", countryName: "United States", region: "Florida", city: "Miami", postalCode: "33101" },
  { country: "US", countryName: "United States", region: "Florida", city: "Orlando", postalCode: "32801" },
  { country: "US", countryName: "United States", region: "Illinois", city: "Chicago", postalCode: "60601" },
  { country: "US", countryName: "United States", region: "Massachusetts", city: "Boston", postalCode: "02108" },
  { country: "US", countryName: "United States", region: "New York", city: "Buffalo", postalCode: "14201" },
  { country: "US", countryName: "United States", region: "New York", city: "New York", postalCode: "10001" },
  { country: "US", countryName: "United States", region: "Texas", city: "Austin", postalCode: "78701" },
  { country: "US", countryName: "United States", region: "Texas", city: "Dallas", postalCode: "75201" },
  { country: "US", countryName: "United States", region: "Texas", city: "Houston", postalCode: "77002" },
  { country: "US", countryName: "United States", region: "Washington", city: "Seattle", postalCode: "98101" },
  { country: "CA", countryName: "Canada", region: "Alberta", city: "Calgary", postalCode: "T2P 1J9" },
  { country: "CA", countryName: "Canada", region: "British Columbia", city: "Vancouver", postalCode: "V6B 1A1" },
  { country: "CA", countryName: "Canada", region: "Ontario", city: "Toronto", postalCode: "M5H 2N2" },
  { country: "CA", countryName: "Canada", region: "Quebec", city: "Montreal", postalCode: "H2Y 1C6" },
  { country: "GB", countryName: "United Kingdom", region: "England", city: "London", postalCode: "EC1A 1BB" },
  { country: "GB", countryName: "United Kingdom", region: "England", city: "Manchester", postalCode: "M1 1AE" },
  { country: "GB", countryName: "United Kingdom", region: "Scotland", city: "Edinburgh", postalCode: "EH1 1YZ" },
  { country: "GB", countryName: "United Kingdom", region: "Wales", city: "Cardiff", postalCode: "CF10 1EP" },
  { country: "AU", countryName: "Australia", region: "New South Wales", city: "Sydney", postalCode: "2000" },
  { country: "AU", countryName: "Australia", region: "Queensland", city: "Brisbane", postalCode: "4000" },
  { country: "AU", countryName: "Australia", region: "Victoria", city: "Melbourne", postalCode: "3000" },
  { country: "AU", countryName: "Australia", region: "Western Australia", city: "Perth", postalCode: "6000" },
  { country: "VN", countryName: "Vietnam", region: "Da Nang", city: "Da Nang", postalCode: "550000" },
  { country: "VN", countryName: "Vietnam", region: "Ha Noi", city: "Ha Noi", postalCode: "100000" },
  { country: "VN", countryName: "Vietnam", region: "Ho Chi Minh City", city: "Ho Chi Minh City", postalCode: "700000" },
  { country: "VN", countryName: "Vietnam", region: "Can Tho", city: "Can Tho", postalCode: "900000" },
  { country: "SG", countryName: "Singapore", region: "Central Singapore", city: "Singapore", postalCode: "018956" },
  { country: "JP", countryName: "Japan", region: "Osaka", city: "Osaka", postalCode: "530-0001" },
  { country: "JP", countryName: "Japan", region: "Tokyo", city: "Tokyo", postalCode: "100-0001" },
  { country: "DE", countryName: "Germany", region: "Bavaria", city: "Munich", postalCode: "80331" },
  { country: "DE", countryName: "Germany", region: "Berlin", city: "Berlin", postalCode: "10115" },
  { country: "FR", countryName: "France", region: "Ile-de-France", city: "Paris", postalCode: "75001" },
  { country: "FR", countryName: "France", region: "Provence-Alpes-Cote d'Azur", city: "Marseille", postalCode: "13001" },
  { country: "NL", countryName: "Netherlands", region: "North Holland", city: "Amsterdam", postalCode: "1011 AB" },
];

export function findAddressLocationByPostalCode(postalCode: string) {
  const key = postalCodeKey(postalCode);
  if (!key) return undefined;
  return addressLocations.find(
    (location) => postalCodeKey(location.postalCode) === key,
  );
}

export function isKnownPostalCode(postalCode: string) {
  return Boolean(findAddressLocationByPostalCode(postalCode));
}

export function hasPostalCodePrefix(postalCode: string) {
  const key = postalCodeKey(postalCode);
  if (!key) return true;
  return addressLocations.some((location) =>
    postalCodeKey(location.postalCode).startsWith(key),
  );
}

export function syncPostalCode(
  address: CustomerAddress,
  postalCode: string,
): CustomerAddress {
  const location = findAddressLocationByPostalCode(postalCode);
  if (!location) return { ...address, postalCode: postalCode.toUpperCase() };
  return {
    ...address,
    country: location.country,
    region: location.region,
    city: location.city,
    postalCode: location.postalCode,
  };
}

export function addressMatchesPostalCode(address: CustomerAddress) {
  const location = findAddressLocationByPostalCode(address.postalCode ?? "");
  return Boolean(
    location
      && location.country === address.country
      && location.region === address.region
      && location.city === address.city,
  );
}

function uniqueOptions(
  locations: readonly AddressLocation[],
  valueFor: (location: AddressLocation) => string,
  labelFor: (location: AddressLocation) => string,
): AddressOption[] {
  const seen = new Set<string>();
  return locations.reduce<AddressOption[]>((options, location) => {
    const value = valueFor(location);
    if (!value || seen.has(value)) return options;
    seen.add(value);
    options.push({ value, label: labelFor(location) });
    return options;
  }, []);
}

function locationsForAddress(
  address: CustomerAddress,
  field: LinkedAddressField,
) {
  return addressLocations.filter((location) => {
    if (field !== "country" && address.country && location.country !== address.country) {
      return false;
    }
    if (field !== "region" && address.region && location.region !== address.region) {
      return false;
    }
    if (field !== "city" && address.city && location.city !== address.city) {
      return false;
    }
    return true;
  });
}

function locationsForOptions(
  address: CustomerAddress,
  field: LinkedAddressField,
) {
  return addressLocations.filter((location) => {
    if (field === "country") return true;
    if (address.country && location.country !== address.country) return false;
    if (field === "region") return true;
    if (address.region && location.region !== address.region) return false;
    if (field === "city") return true;
    return !address.city || location.city === address.city;
  });
}

export function getLinkedAddressOptions(
  address: CustomerAddress,
  field: LinkedAddressField,
): AddressOption[] {
  let locations = locationsForOptions(address, field);
  if (!locations.length) {
    locations = field === "country"
      ? [...addressLocations]
      : addressLocations.filter(
          (location) => !address.country || location.country === address.country,
        );
  }

  let options: AddressOption[];
  if (field === "country") {
    options = uniqueOptions(
      locations,
      (location) => location.country,
      (location) => `${location.countryName} (${location.country})`,
    );
  } else if (field === "region") {
    options = uniqueOptions(
      locations,
      (location) => location.region,
      (location) => address.country
        ? location.region
        : `${location.region} (${location.country})`,
    );
  } else if (field === "city") {
    options = uniqueOptions(
      locations,
      (location) => location.city,
      (location) => address.region
        ? location.city
        : `${location.city}, ${location.region}`,
    );
  } else {
    options = uniqueOptions(
      locations,
      (location) => location.postalCode,
      (location) => address.city
        ? location.postalCode
        : `${location.postalCode} — ${location.city}, ${location.region}`,
    );
  }

  const currentValue = address[field] ?? "";
  if (
    field !== "postalCode"
    && currentValue
    && !options.some((option) => option.value === currentValue)
  ) {
    options.unshift({ value: currentValue, label: `${currentValue} (saved)` });
  }
  return options;
}

export function syncLinkedAddressField(
  address: CustomerAddress,
  field: LinkedAddressField,
  value: string,
): CustomerAddress {
  if (!value) {
    if (field === "country") {
      return { ...address, country: "", region: "", city: "", postalCode: "" };
    }
    if (field === "region") {
      return { ...address, region: "", city: "", postalCode: "" };
    }
    if (field === "city") {
      return { ...address, city: "", postalCode: "" };
    }
    return { ...address, postalCode: "" };
  }

  if (field === "postalCode") return syncPostalCode(address, value);

  const scopedLocations = locationsForAddress(address, field);
  const location = scopedLocations.find((candidate) => candidate[field] === value)
    ?? addressLocations.find((candidate) => candidate[field] === value);

  if (!location) return { ...address, [field]: value };
  return {
    ...address,
    country: location.country,
    region: location.region,
    city: location.city,
    postalCode: location.postalCode,
  };
}
