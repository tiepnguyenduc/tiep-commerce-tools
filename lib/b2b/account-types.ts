export type B2BAccountAddress = {
  id?: string;
  company: string;
  firstName?: string;
  lastName?: string;
  streetName: string;
  streetNumber?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
};
export type B2BAccountProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  addresses: B2BAccountAddress[];
  defaultShippingAddressId?: string;
  defaultBillingAddressId?: string;
  countries: string[];
  companies: {
    key: string;
    name: string;
    roles: string[];
    stores: string[];
  }[];
};
