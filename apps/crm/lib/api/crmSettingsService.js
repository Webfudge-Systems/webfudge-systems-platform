/**
 * Org-level Grow settings (ticket GF4) — Strapi /crm-settings.
 * { industries: { items: string[] }, lead_sources: { items: {value,label}[] | null }, notification_prefs: { [category]: boolean } }
 */
import { useEffect, useState } from 'react';
import strapiClient from '../strapiClient';

const ENDPOINT = '/crm-settings';

let cache = null;
let inflight = null;
const listeners = new Set();

const crmSettingsService = {
  /** Cached per page load; pass force to refetch. */
  async getAll({ force = false } = {}) {
    if (cache && !force) return cache;
    if (!inflight || force) {
      inflight = strapiClient
        .get(ENDPOINT)
        .then((res) => {
          cache = res?.data || {};
          listeners.forEach((fn) => fn(cache));
          return cache;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },
  async save(key, value) {
    const res = await strapiClient.put(`${ENDPOINT}/${key}`, { data: value });
    cache = { ...(cache || {}), [key]: res?.data };
    listeners.forEach((fn) => fn(cache));
    return res?.data;
  },
};

/** React hook: current org settings (null until loaded; {} if the request fails). */
export function useCrmSettings() {
  const [settings, setSettings] = useState(cache);
  useEffect(() => {
    listeners.add(setSettings);
    if (!cache) crmSettingsService.getAll().catch(() => setSettings({}));
    return () => listeners.delete(setSettings);
  }, []);
  return settings;
}

export default crmSettingsService;
