/**
 * Industry, company type, and sub-type options for lead company forms (new + detail).
 * Keep in sync with backend free-text fields; values are stored as-is on lead-company.
 */

export const industryOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'education', label: 'Education' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

export const companyTypes = [
  { id: 'startup-corporate', name: 'Startup and Corporates' },
  { id: 'investor', name: 'Investors' },
  { id: 'enablers-academia', name: 'Enablers & Academia' },
];

export const subTypeOptionsByCompanyType = {
  'startup-corporate': [
    'EV 2W', 'EV 3W', 'EV OEM', 'EV 4W', 'Motor OEM', 'Motor Controller OEM',
    'Batteries', 'Charging Infra', 'Drones', 'AGVs', 'Consumer electronics',
    'Incubator / accelerator', 'Power electronics', 'Other OE', 'Group', 'EV Fleet',
    'E-commerce companies', '3rd party logistics', 'Vehicle Smarts', 'Swapping',
    'EV Leasing', 'EV Rentals', 'EV NBFC', 'Power electronics+Vechicle smart',
    'Electronics Components', '1DL/MDL', 'Franchisee', 'Smart Battery', 'Dealer',
    'Motor Parts', 'Spare Part', 'Traditional Auto', 'Smart Electronic', 'Mech Parts',
    'Energy Storing', 'Automotive Parts_ EV manufacturers', 'IOT', 'Inverter', 'Aggregator',
  ],
  investor: [
    'Future Founder', 'Private Lender P2P', 'Angel', 'Angel Network', 'Micro VC', 'VC',
    'Family Office', 'Private Equity PE', 'Debt', 'WC Working Capital', 'NBFC',
    'Bill discounting', 'Investment Bank', 'Banks', 'Asset Investor', 'Asset Financier',
    'Asset Leasing', 'Op Franchisee', 'Franchise Network', 'Incubation Center', 'Accelerator',
    'Industry body', 'Gov Body', 'Gov Policy', 'Alternative Investment Platform',
    'Strategic investor', 'CVC', 'HNI',
  ],
  'enablers-academia': [
    'Incubator', 'Accelerator', 'Venture Studio', 'Academia', 'Government Office',
    'Mentor', 'Investment Banker',
  ],
};

export function getSubTypeOptionsForType(companyTypeId) {
  if (!companyTypeId) return [];
  const list = subTypeOptionsByCompanyType[companyTypeId];
  return (list || []).map((subType) => ({ value: subType, label: subType }));
}

export const companyTypeSelectOptions = companyTypes.map((t) => ({
  value: t.id,
  label: t.name,
}));

/** Map saved free-text / label casing to canonical option value for controlled selects. */
export function canonicalIndustryValue(stored) {
  const v = (stored || '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  const hit = industryOptions.find(
    (o) => o.value === lower || o.label.toLowerCase() === lower || o.value === v
  );
  return hit ? hit.value : v;
}

export function canonicalCompanyTypeValue(stored) {
  const v = (stored || '').trim();
  if (!v) return '';
  if (companyTypes.some((t) => t.id === v)) return v;
  const hit = companyTypes.find((t) => t.name.toLowerCase() === v.toLowerCase());
  return hit ? hit.id : v;
}
