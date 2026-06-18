'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');
const { generateSequence } = require('../../../utils/sequence');

const UID = 'api::payroll-run.payroll-run';
const LINE_UID = 'api::payroll-line-item.payroll-line-item';
const PROFILE_UID = 'api::employee-profile.employee-profile';
const ORG_USER_UID = 'api::organization-user.organization-user';

const base = makeBooksCrudController(UID, { defaultPopulate: ['lineItems'] });

const LINE_ITEM_POPULATE = {
  organizationUser: {
    populate: ['user', 'departments', 'primaryDepartment'],
  },
  employeeProfile: true,
  salaryStructure: true,
  payrollRun: true,
};

async function loadRunWithLineItems(strapi, runId) {
  const run = await strapi.entityService.findOne(UID, runId, {
    populate: ['organization'],
  });
  if (!run) return null;

  const lineItems = await strapi.entityService.findMany(LINE_UID, {
    filters: { payrollRun: runId },
    populate: LINE_ITEM_POPULATE,
    limit: 2000,
    sort: { id: 'asc' },
  });

  return { ...run, lineItems };
}

function toMoney(value) {
  return Math.max(0, Math.round(Number(value || 0)));
}

function getTdsRate(annualGross) {
  if (annualGross <= 500000) return 0;
  if (annualGross <= 1000000) return 0.05;
  return 0.1;
}

const DEFAULT_SPLIT = {
  basicPercent: 40,
  hraPercent: 20,
  specialAllowancePercent: 30,
  fbpPercent: 10,
};

function calcFromStructure(structure, annualCtcOverride = 0) {
  const annualCtc = toMoney(annualCtcOverride || structure?.ctc || 0);
  if (!annualCtc) {
    return {
      basic: 0,
      hra: 0,
      specialAllowance: 0,
      fbp: 0,
      gross: 0,
      pf: 0,
      esi: 0,
      pt: 0,
      tds: 0,
      deductionsTotal: 0,
      net: 0,
      tdsEstimate: true,
      missingSalaryStructure: true,
    };
  }

  const split = structure || DEFAULT_SPLIT;
  const monthlyGross = toMoney(annualCtc / 12);

  const basic = toMoney((monthlyGross * Number(split.basicPercent || DEFAULT_SPLIT.basicPercent)) / 100);
  const hra = toMoney((monthlyGross * Number(split.hraPercent || DEFAULT_SPLIT.hraPercent)) / 100);
  const specialAllowance = toMoney(
    (monthlyGross * Number(split.specialAllowancePercent || DEFAULT_SPLIT.specialAllowancePercent)) / 100
  );
  const fbp = toMoney(monthlyGross - basic - hra - specialAllowance);

  const pfBase = Math.min(basic, 15000);
  const pf = toMoney(pfBase * 0.12);
  const esi = monthlyGross <= 21000 ? toMoney(monthlyGross * 0.0075) : 0;
  const pt = monthlyGross > 15000 ? 200 : 0;
  const tds = toMoney(monthlyGross * getTdsRate(annualCtc));
  const deductionsTotal = toMoney(pf + esi + pt + tds);
  const net = toMoney(monthlyGross - deductionsTotal);

  return {
    basic,
    hra,
    specialAllowance,
    fbp,
    gross: monthlyGross,
    pf,
    esi,
    pt,
    tds,
    deductionsTotal,
    net,
    tdsEstimate: true,
    missingSalaryStructure: !structure,
  };
}

async function resolveRunOr403(strapi, orgId, runId) {
  const run = await strapi.entityService.findOne(UID, runId, { populate: ['organization'] });
  if (!run) return { error: 'notFound' };
  if (relId(run.organization) !== orgId) return { error: 'forbidden' };
  return { run };
}

async function gatherMembersAndProfiles(strapi, orgId) {
  const [members, profiles] = await Promise.all([
    strapi.entityService.findMany(ORG_USER_UID, {
      filters: { organization: orgId, isActive: true },
      populate: ['user', 'role', 'departments', 'primaryDepartment'],
      limit: 1000,
      sort: { id: 'asc' },
    }),
    strapi.entityService.findMany(PROFILE_UID, {
      filters: { organization: orgId },
      populate: ['organizationUser', 'salaryStructure'],
      limit: 1000,
    }),
  ]);

  const profileByOrgUserId = new Map();
  for (const profile of profiles) {
    const orgUserId = relId(profile.organizationUser);
    if (orgUserId != null) profileByOrgUserId.set(orgUserId, profile);
  }

  return { members, profileByOrgUserId };
}

async function deleteRunLineItems(strapi, runId) {
  const existing = await strapi.entityService.findMany(LINE_UID, {
    filters: { payrollRun: runId },
    fields: ['id'],
    limit: 2000,
  });
  for (const row of existing) {
    await strapi.entityService.delete(LINE_UID, row.id);
  }
}

async function recomputeRun(strapi, orgId, runId, actorUserId) {
  const { members, profileByOrgUserId } = await gatherMembersAndProfiles(strapi, orgId);
  await deleteRunLineItems(strapi, runId);

  const blockers = [];
  const createdRows = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let pfLiability = 0;

  for (const member of members) {
    const profile = profileByOrgUserId.get(member.id) || null;
    const structure = profile?.salaryStructure || null;
    const annualCtc = toMoney(profile?.annualCtc || structure?.ctc || 0);
    const hasBankDetails =
      Boolean(profile?.bankAccountNumber) && Boolean(profile?.bankIfsc) && Boolean(profile?.bankName);
    const calc = calcFromStructure(structure, annualCtc);

    const row = await strapi.entityService.create(LINE_UID, {
      data: {
        ...calc,
        missingBankDetails: !hasBankDetails,
        payrollRun: runId,
        organizationUser: member.id,
        employeeProfile: profile?.id || null,
        salaryStructure: structure?.id || null,
        organization: orgId,
        createdByUser: actorUserId,
      },
      populate: LINE_ITEM_POPULATE,
    });

    if (calc.missingSalaryStructure || !hasBankDetails) {
      blockers.push({
        lineItemId: row.id,
        organizationUserId: member.id,
        employeeName:
          `${member?.user?.firstName || ''} ${member?.user?.lastName || ''}`.trim() ||
          member?.user?.username ||
          member?.user?.email ||
          `Member ${member.id}`,
        missingSalaryStructure: calc.missingSalaryStructure,
        missingBankDetails: !hasBankDetails,
      });
    }

    totalGross += row.gross || 0;
    totalDeductions += row.deductionsTotal || 0;
    totalNet += row.net || 0;
    pfLiability += row.pf || 0;
    createdRows.push(row);
  }

  await strapi.entityService.update(UID, runId, {
    data: {
      totalEmployees: members.length,
      totalGross: toMoney(totalGross),
      totalDeductions: toMoney(totalDeductions),
      totalNet: toMoney(totalNet),
      pfLiability: toMoney(pfLiability),
    },
  });

  return { lineItems: createdRows, blockers };
}

module.exports = (params) => {
  const core = base(params);

  return {
    ...core,

    async create(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const body = ctx.request?.body || {};
      const payload = body.data || body;
      const month = Number(payload.month);
      const year = Number(payload.year);
      if (!Number.isInteger(month) || month < 1 || month > 12) return ctx.badRequest('Invalid payroll month');
      if (!Number.isInteger(year) || year < 2000) return ctx.badRequest('Invalid payroll year');

      const existing = await strapi.entityService.findMany(UID, {
        filters: { organization: ctx.state.orgId, month, year },
        limit: 1,
      });
      if (existing.length) {
        return ctx.badRequest('Payroll run already exists for this month/year');
      }

      const runNumber = await generateSequence(ctx.state.orgId, 'payrollSequence', 'PAY');
      const run = await strapi.entityService.create(UID, {
        data: {
          month,
          year,
          status: 'draft',
          runNumber,
          organization: ctx.state.orgId,
          createdByUser: ctx.state.user.id,
        },
      });
      const { blockers } = await recomputeRun(strapi, ctx.state.orgId, run.id, ctx.state.user.id);
      const populated = await loadRunWithLineItems(strapi, run.id);
      return { data: populated, meta: { blockers } };
    },

    async findOne(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) return ctx.notFound();
      const resolved = await resolveRunOr403(strapi, ctx.state.orgId, id);
      if (resolved.error === 'notFound') return ctx.notFound();
      if (resolved.error === 'forbidden') return ctx.forbidden();

      const run = await loadRunWithLineItems(strapi, id);
      return { data: run };
    },

    async recalculate(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) return ctx.notFound();
      const resolved = await resolveRunOr403(strapi, ctx.state.orgId, id);
      if (resolved.error === 'notFound') return ctx.notFound();
      if (resolved.error === 'forbidden') return ctx.forbidden();
      if (resolved.run.status !== 'draft') {
        return ctx.badRequest('Only draft runs can be recalculated');
      }

      const { blockers } = await recomputeRun(strapi, ctx.state.orgId, id, ctx.state.user.id);
      const run = await loadRunWithLineItems(strapi, id);
      return { data: run, meta: { blockers } };
    },

    async review(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const id = Number(ctx.params.id);
      const resolved = await resolveRunOr403(strapi, ctx.state.orgId, id);
      if (resolved.error === 'notFound') return ctx.notFound();
      if (resolved.error === 'forbidden') return ctx.forbidden();
      if (resolved.run.status !== 'draft') return ctx.badRequest('Run must be in draft to move to review');

      await strapi.entityService.update(UID, id, { data: { status: 'review' } });
      const run = await loadRunWithLineItems(strapi, id);
      return { data: run };
    },

    async lock(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const id = Number(ctx.params.id);
      const resolved = await resolveRunOr403(strapi, ctx.state.orgId, id);
      if (resolved.error === 'notFound') return ctx.notFound();
      if (resolved.error === 'forbidden') return ctx.forbidden();
      if (resolved.run.status !== 'review') return ctx.badRequest('Run must be in review before lock');

      const lineItems = await strapi.entityService.findMany(LINE_UID, {
        filters: { payrollRun: id },
        populate: ['organizationUser', 'organizationUser.user'],
        limit: 2000,
      });
      const blockers = lineItems
        .filter((line) => line.missingSalaryStructure || line.missingBankDetails)
        .map((line) => ({
          lineItemId: line.id,
          organizationUserId: relId(line.organizationUser),
          employeeName:
            `${line?.organizationUser?.user?.firstName || ''} ${line?.organizationUser?.user?.lastName || ''}`.trim() ||
            line?.organizationUser?.user?.username ||
            line?.organizationUser?.user?.email ||
            `Member ${relId(line.organizationUser)}`,
          missingSalaryStructure: Boolean(line.missingSalaryStructure),
          missingBankDetails: Boolean(line.missingBankDetails),
        }));

      if (blockers.length) {
        return ctx.badRequest('Cannot lock payroll run. Fix employee blockers first.', { blockers });
      }

      await strapi.entityService.update(UID, id, {
        data: {
          status: 'locked',
          lockedAt: new Date().toISOString(),
        },
      });
      const run = await loadRunWithLineItems(strapi, id);
      return { data: run };
    },

    async disburse(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const id = Number(ctx.params.id);
      const resolved = await resolveRunOr403(strapi, ctx.state.orgId, id);
      if (resolved.error === 'notFound') return ctx.notFound();
      if (resolved.error === 'forbidden') return ctx.forbidden();
      if (resolved.run.status !== 'locked') return ctx.badRequest('Run must be locked before disburse');

      await strapi.entityService.update(UID, id, {
        data: {
          status: 'disbursed',
          disbursedAt: new Date().toISOString(),
        },
      });
      const run = await loadRunWithLineItems(strapi, id);
      return { data: run };
    },
  };
};
