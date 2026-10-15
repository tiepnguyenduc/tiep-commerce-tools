export type CompanyAddress = {
  id: string;
  company: string;
  streetName: string;
  streetNumber: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type CompanyAssociate = {
  customerId: string;
  name: string;
  email: string;
  roleKeys: string[];
  inherited: boolean;
};

export type CompanyUnit = {
  key: string;
  name: string;
  email: string;
  unitType: string;
  parentKey: string;
  stores: string[];
  canEditDetails: boolean;
  canManageAssociates: boolean;
  canAddChildUnits: boolean;
  addresses: CompanyAddress[];
  associates: CompanyAssociate[];
};

export type CompanyWorkspace = {
  units: CompanyUnit[];
  roles: { key: string; name: string }[];
  countries: string[];
};
