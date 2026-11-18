import { collectDistinctIndustriesFromList } from '@webfudge/ui';
import clientAccountService from './api/clientAccountService';
import leadCompanyService from './api/leadCompanyService';
import crmSettingsService from './api/crmSettingsService';

async function industriesFromEndpoint(getAll) {
  return collectDistinctIndustriesFromList((page, pageSize) =>
    getAll({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
    })
  );
}

/** Industries the org added in Settings → Picklists (GF4). */
async function orgIndustries() {
  const settings = await crmSettingsService.getAll().catch(() => ({}));
  return Array.isArray(settings?.industries?.items) ? settings.industries.items : [];
}

/** Org-configured industries plus distinct values already saved on client accounts and lead companies. */
export async function fetchStoredIndustriesForCrm() {
  const [fromOrg, fromAccounts, fromLeads] = await Promise.all([
    orgIndustries(),
    industriesFromEndpoint((params) => clientAccountService.getAll(params)).catch(() => []),
    industriesFromEndpoint((params) => leadCompanyService.getAll(params)).catch(() => []),
  ]);
  return [...new Set([...fromOrg, ...fromAccounts, ...fromLeads])];
}
