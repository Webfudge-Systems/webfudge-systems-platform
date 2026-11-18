import { collectDistinctIndustriesFromList } from '@webfudge/ui';
import clientAccountService from './api/clientAccountService';
import strapiClient from './strapiClient';

/** Industries the org added in Grow → Settings → Industries & lead sources (GF4). */
async function orgIndustries() {
  try {
    const res = await strapiClient.get('/crm-settings');
    const items = res?.data?.industries?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

/** Org-configured industries plus distinct values already saved on client accounts. */
export async function fetchStoredIndustriesForPm() {
  const [fromOrg, fromAccounts] = await Promise.all([
    orgIndustries(),
    collectDistinctIndustriesFromList((page, pageSize) =>
      clientAccountService.getAll({
        'pagination[page]': page,
        'pagination[pageSize]': pageSize,
      })
    ).catch(() => []),
  ]);
  return [...new Set([...fromOrg, ...fromAccounts])];
}
