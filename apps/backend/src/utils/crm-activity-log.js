'use strict';

const ACTIVITY_UID = 'api::crm-activity.crm-activity';

const FIELD_LABELS = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  companyName: 'Company name',
  companyWebsite: 'Company website',
  status: 'Status',
  source: 'Source',
  preferredContactMethod: 'Preferred contact method',
  birthDate: 'Birth date',
  timezone: 'Timezone',
  jobTitle: 'Job title',
  department: 'Department',
  contactRole: 'Contact role',
  isPrimaryContact: 'Primary contact',
  address: 'Address',
  city: 'City',
  state: 'State',
  country: 'Country',
  zipCode: 'ZIP / postal code',
  linkedIn: 'LinkedIn',
  twitter: 'Twitter',
  notes: 'Notes',
  assignedTo: 'Assignee',
  leadCompany: 'Lead company',
  industry: 'Industry',
  type: 'Type',
  subType: 'Subtype',
  website: 'Website',
  employees: 'Employees',
  founded: 'Founded',
  description: 'Description',
  segment: 'Segment',
  score: 'Lead score',
  healthScore: 'Health score',
  dealValue: 'Deal value',
};

function contactLabel(entity) {
  if (!entity) return 'Contact';
  const fn = (entity.firstName || '').trim();
  const ln = (entity.lastName || '').trim();
  if (fn && ln) return `${fn} ${ln}`;
  if (entity.email) return String(entity.email);
  return 'Contact';
}

function leadCompanyLabel(entity) {
  if (!entity) return 'Lead company';
  return (entity.companyName || entity.name || 'Lead company').trim() || 'Lead company';
}

function labelForField(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function leadCompanyFk(subjectType, entity) {
  if (subjectType === 'lead_company') return entity?.id ?? null;
  if (subjectType === 'contact') {
    const lc = entity?.leadCompany;
    if (lc == null) return null;
    if (typeof lc === 'object') return lc.id ?? null;
    return lc;
  }
  return null;
}

function buildSummary(action, subjectType, entity, changedKeys, fieldChangeCount) {
  const n =
    typeof fieldChangeCount === 'number' && fieldChangeCount >= 0
      ? fieldChangeCount
      : changedKeys?.length ?? 0;
  if (subjectType === 'contact') {
    const name = contactLabel(entity);
    if (action === 'create') return `Contact "${name}" was created`;
    if (action === 'delete') return `Contact "${name}" was deleted`;
    if (n > 0) {
      return `Contact "${name}" was updated (${n} field${n !== 1 ? 's' : ''})`;
    }
    return `Contact "${name}" was updated`;
  }
  if (subjectType === 'lead_company') {
    const name = leadCompanyLabel(entity);
    if (action === 'create') return `Lead company "${name}" was created`;
    if (action === 'delete') return `Lead company "${name}" was deleted`;
    if (n > 0) {
      return `Lead company "${name}" was updated (${n} field${n !== 1 ? 's' : ''})`;
    }
    return `Lead company "${name}" was updated`;
  }
  if (action === 'create') return `Record was created`;
  if (action === 'delete') return `Record was deleted`;
  return `Record was updated`;
}

const IGNORE_UPDATE_KEYS = new Set([
  'id',
  'documentId',
  'organization',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
]);

/**
 * Persist a CRM timeline row. Failures are swallowed so mutations still succeed.
 */
async function logCrmActivity(strapi, params) {
  const {
    organizationId,
    actorUserId,
    action,
    subjectType,
    entity,
    changedKeys: changedKeysParam,
    previousEntity,
    patch,
  } = params;
  if (!organizationId || !subjectType || !entity?.id) return;

  const subjectId = Number(entity.id);
  if (Number.isNaN(subjectId)) return;

  let fieldChanges = [];
  if (action === 'update' && previousEntity && patch && typeof patch === 'object') {
    fieldChanges = buildFieldChanges(previousEntity, patch);
  }
  const changedKeys =
    fieldChanges.length > 0
      ? fieldChanges.map((c) => c.key)
      : changedKeysParam?.length
        ? changedKeysParam
        : collectChangedKeys(patch || {});

  const lcId = leadCompanyFk(subjectType, entity);
  const summary = buildSummary(
    action,
    subjectType,
    entity,
    changedKeys,
    fieldChanges.length || changedKeys?.length || 0
  );

  const row = {
    organization: organizationId,
    actor: actorUserId ?? null,
    action,
    subjectType,
    subjectId,
    leadCompany: lcId,
    summary,
  };
  if (action === 'update' && (fieldChanges.length > 0 || changedKeys?.length)) {
    row.meta = {
      changedFields: changedKeys,
      ...(fieldChanges.length > 0 ? { changes: fieldChanges } : {}),
    };
  }

  try {
    await strapi.entityService.create(ACTIVITY_UID, { data: row });
  } catch (err) {
    strapi.log.warn(
      'crm-activity-log: failed to write activity (%s %s:%s): %s',
      action,
      subjectType,
      subjectId,
      err?.message || err
    );
  }
}

function collectChangedKeys(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data).filter((k) => !IGNORE_UPDATE_KEYS.has(k));
}

const MAX_DETAIL_LEN = 400;

function truncateDetail(s) {
  if (s.length <= MAX_DETAIL_LEN) return s;
  return `${s.slice(0, MAX_DETAIL_LEN)}…`;
}

function relationCompareId(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'object') {
    const id = val.id ?? val.documentId;
    return id != null ? String(id) : '';
  }
  return String(val).trim();
}

function formatDetailValue(key, val) {
  if (val == null || val === '') return '(empty)';
  if (key === 'assignedTo' || key === 'leadCompany') {
    if (typeof val === 'object' && val !== null) {
      const bit =
        val.email ||
        val.username ||
        val.companyName ||
        (val.firstName || val.lastName
          ? `${val.firstName || ''} ${val.lastName || ''}`.trim()
          : null);
      if (bit) return truncateDetail(String(bit));
      if (val.id != null) return `ID ${val.id}`;
      return truncateDetail(JSON.stringify(val));
    }
    return val === '' ? '(empty)' : `ID ${val}`;
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return truncateDetail(JSON.stringify(val));
  const s = String(val).trim();
  return s === '' ? '(empty)' : truncateDetail(s);
}

function valuesDiffer(key, beforeVal, afterVal) {
  if (key === 'assignedTo' || key === 'leadCompany') {
    return relationCompareId(beforeVal) !== relationCompareId(afterVal);
  }
  if (beforeVal == null && afterVal == null) return false;
  if (typeof beforeVal === 'number' && typeof afterVal === 'number') {
    return beforeVal !== afterVal;
  }
  if (typeof beforeVal === 'boolean' && typeof afterVal === 'boolean') {
    return beforeVal !== afterVal;
  }
  const sb = beforeVal == null || beforeVal === '' ? '' : String(beforeVal).trim();
  const sa = afterVal == null || afterVal === '' ? '' : String(afterVal).trim();
  return sb !== sa;
}

/**
 * @param {object} previous - entity before update (flat attributes)
 * @param {object} patch - request data keys
 * @returns {{ key: string, label: string, before: string, after: string }[]}
 */
function buildFieldChanges(previous, patch) {
  if (!previous || !patch || typeof patch !== 'object') return [];
  const keys = collectChangedKeys(patch);
  const out = [];
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const afterRaw = patch[key];
    const beforeRaw = previous[key];
    if (!valuesDiffer(key, beforeRaw, afterRaw)) continue;
    out.push({
      key,
      label: labelForField(key),
      before: formatDetailValue(key, beforeRaw),
      after: formatDetailValue(key, afterRaw),
    });
  }
  return out;
}

module.exports = {
  ACTIVITY_UID,
  logCrmActivity,
  collectChangedKeys,
  buildFieldChanges,
  contactLabel,
  leadCompanyLabel,
};
