import { useMemo } from 'react';
import { useCrmSettings } from './api/crmSettingsService';

/** Built-in lead sources, used until an org saves its own list in Settings → Picklists (GF4). */
export const DEFAULT_LEAD_SOURCES = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
];

/** Labels for sources set by automatic lead capture (G7 / G6) when they are not in the org's list. */
const CAPTURE_SOURCE_LABELS = {
  GOOGLE_ADS: 'Google Ads',
  INDIAMART: 'IndiaMART',
  JUSTDIAL: 'JustDial',
  '99ACRES': '99acres',
  MAGICBRICKS: 'MagicBricks',
  META_LEAD_ADS: 'Meta Lead Ads',
};

export const humanizeSourceValue = (value) =>
  CAPTURE_SOURCE_LABELS[value] ||
  String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Lead source dropdown options for this org. `keep` adds a value that's no longer in the list
 * (e.g. an existing record's source) so it still shows.
 */
export function useLeadSourceOptions(keep) {
  const settings = useCrmSettings();
  return useMemo(() => {
    const items = settings?.lead_sources?.items;
    const list = Array.isArray(items) && items.length ? items : DEFAULT_LEAD_SOURCES;
    if (keep && !list.some((o) => o.value === keep)) return [...list, { value: keep, label: humanizeSourceValue(keep) }];
    return list;
  }, [settings, keep]);
}

/** Label for a stored source value using the org's list, else a humanized value. */
export function useLeadSourceLabel() {
  const options = useLeadSourceOptions();
  return useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return (value) => map.get(value) || humanizeSourceValue(value);
  }, [options]);
}
