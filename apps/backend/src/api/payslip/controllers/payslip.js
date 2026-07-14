'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');
const { generateSequence } = require('../../../utils/sequence');
const { buildPayslipPdfBuffer } = require('../../../utils/payslip-pdf');

const UID = 'api::payslip.payslip';
const RUN_UID = 'api::payroll-run.payroll-run';
const LINE_UID = 'api::payroll-line-item.payroll-line-item';

const base = makeBooksCrudController(UID, {
  defaultPopulate: ['payrollRun', 'payrollLineItem', 'organizationUser'],
  extraFilters: (q) => {
    const filters = {};
    if (q.payrollRun) filters.payrollRun = q.payrollRun;
    if (q.payrollLineItem) filters.payrollLineItem = q.payrollLineItem;
    if (q.organizationUser) filters.organizationUser = q.organizationUser;
    return filters;
  },
});

const PAYSLIP_LIST_POPULATE = {
  payrollRun: true,
  payrollLineItem: { populate: ['employeeProfile'] },
  organizationUser: { populate: ['user', 'primaryDepartment'] },
};

module.exports = (params) => {
  const core = base(params);

  return {
    ...core,

    async find(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const q = ctx.query || {};
      const page = parseInt(q.page || '1', 10);
      const limit = Math.min(parseInt(q.limit || '20', 10), 200);
      const filters = { organization: ctx.state.orgId };
      if (q.payrollRun) filters.payrollRun = q.payrollRun;
      if (q.payrollLineItem) filters.payrollLineItem = q.payrollLineItem;
      if (q.organizationUser) filters.organizationUser = q.organizationUser;

      const [results, total] = await Promise.all([
        strapi.entityService.findMany(UID, {
          filters,
          start: (page - 1) * limit,
          limit,
          sort: q.sort || { createdAt: 'desc' },
          populate: PAYSLIP_LIST_POPULATE,
        }),
        strapi.db.query(UID).count({ where: filters }),
      ]);

      return { data: results, meta: { pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } } };
    },

    async generate(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const body = ctx.request?.body || {};
      const payload = body.data || body;
      const payrollRunId = Number(payload.payrollRunId);
      const payrollLineItemId = Number(payload.payrollLineItemId);
      if (!Number.isFinite(payrollRunId) || !Number.isFinite(payrollLineItemId)) {
        return ctx.badRequest('payrollRunId and payrollLineItemId are required');
      }

      const [run, lineItem] = await Promise.all([
        strapi.entityService.findOne(RUN_UID, payrollRunId, { populate: ['organization'] }),
        strapi.entityService.findOne(LINE_UID, payrollLineItemId, { populate: ['organization'] }),
      ]);
      if (!run || !lineItem) return ctx.notFound();
      if (
        String(relId(run.organization)) !== String(ctx.state.orgId) ||
        String(relId(lineItem.organization)) !== String(ctx.state.orgId)
      ) {
        return ctx.forbidden();
      }
      if (relId(lineItem.payrollRun) != null && String(relId(lineItem.payrollRun)) !== String(run.id)) {
        return ctx.badRequest('Line item does not belong to this payroll run');
      }

      const existing = await strapi.entityService.findMany(UID, {
        filters: { payrollLineItem: lineItem.id, organization: ctx.state.orgId },
        limit: 1,
      });
      if (existing.length) {
        const populated = await strapi.entityService.findOne(UID, existing[0].id, {
          populate: PAYSLIP_LIST_POPULATE,
        });
        return { data: populated };
      }

      const payslipNumber = await generateSequence(ctx.state.orgId, 'payslipSequence', 'PSL');
      const generatedAt = new Date().toISOString();
      const payslip = await strapi.entityService.create(UID, {
        data: {
          payslipNumber,
          generatedAt,
          payrollRun: run.id,
          payrollLineItem: lineItem.id,
          organizationUser: relId(lineItem.organizationUser),
          organization: ctx.state.orgId,
          createdByUser: ctx.state.user.id,
        },
        populate: PAYSLIP_LIST_POPULATE,
      });

      await strapi.entityService.update(LINE_UID, lineItem.id, { data: { payslipGeneratedAt: generatedAt } });
      return { data: payslip };
    },

    async download(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const payslipId = Number(ctx.params.id);
      if (!Number.isFinite(payslipId)) return ctx.notFound();
      const payslip = await strapi.entityService.findOne(UID, payslipId, {
        populate: [
          'organization',
          'payrollRun',
          'payrollLineItem',
          'payrollLineItem.employeeProfile',
          'organizationUser',
          'organizationUser.user',
          'organizationUser.primaryDepartment',
        ],
      });
      if (!payslip) return ctx.notFound();
      if (String(relId(payslip.organization)) !== String(ctx.state.orgId)) return ctx.forbidden();

      const pdfBuffer = await buildPayslipPdfBuffer(payslip);
      ctx.set('Content-Type', 'application/pdf');
      ctx.set('Content-Disposition', `attachment; filename=\"${payslip.payslipNumber}.pdf\"`);
      ctx.body = pdfBuffer;
    },
  };
};
