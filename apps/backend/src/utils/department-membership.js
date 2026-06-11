'use strict';

const DEPARTMENT_UID = 'api::department.department';
const ORG_USER_UID = 'api::organization-user.organization-user';

function normalizeIdList(raw) {
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const ids = [];
  for (const item of list) {
    const id =
      typeof item === 'object' && item != null
        ? item.id ?? item.documentId
        : Number.parseInt(String(item), 10);
    if (id && !Number.isNaN(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function primaryDepartmentIdFromMembership(membership) {
  const primary = membership?.primaryDepartment;
  if (typeof primary === 'object' && primary?.id) return primary.id;
  if (primary != null && primary !== '') return Number(primary);
  const raw = membership?.departments;
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const fromList = list
    .map((d) => (typeof d === 'object' && d != null ? d.id : Number(d)))
    .filter((id) => id && !Number.isNaN(id));
  return fromList[0] ?? null;
}

async function validateDepartmentsInOrg(strapi, orgId, departmentIds) {
  const ids = normalizeIdList(departmentIds);
  if (!ids.length) return [];

  const rows = await strapi.entityService.findMany(DEPARTMENT_UID, {
    filters: { id: { $in: ids }, organization: orgId },
    fields: ['id'],
    limit: ids.length,
  });
  const found = new Set((rows || []).map((r) => r.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) {
    throw new Error('One or more departments are invalid for this organization');
  }
  return ids;
}

async function applyMembershipDepartments(strapi, membershipId, orgId, { departmentIds, primaryDepartmentId } = {}) {
  const ids = await validateDepartmentsInOrg(strapi, orgId, departmentIds);
  let primary = primaryDepartmentId != null ? Number(primaryDepartmentId) : null;
  if (primary && !ids.includes(primary)) {
    throw new Error('Primary department must be included in assigned departments');
  }
  if (!primary && ids.length) primary = ids[0];

  const data = { departments: ids };
  if (primary) data.primaryDepartment = primary;
  else data.primaryDepartment = null;

  return strapi.entityService.update(ORG_USER_UID, membershipId, {
    data,
    populate: ['departments', 'primaryDepartment'],
  });
}

function departmentsPayload(membership) {
  const raw = membership?.departments;
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const departments = list
    .filter((d) => d && typeof d === 'object')
    .map((d) => ({
      id: d.id,
      name: d.name || '',
      isActive: d.isActive !== false,
    }));
  const primaryDepartmentId = primaryDepartmentIdFromMembership(membership);
  return { departments, primaryDepartmentId };
}

module.exports = {
  DEPARTMENT_UID,
  applyMembershipDepartments,
  departmentsPayload,
  normalizeIdList,
  primaryDepartmentIdFromMembership,
  validateDepartmentsInOrg,
};
