'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');
const { generateSequence } = require('../../../utils/sequence');

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

async function buildPayslipPdfBuffer(payslip) {
  const PDFDocument = require('pdfkit');

  const row = payslip.payrollLineItem || {};
  const run = payslip.payrollRun || {};
  const orgUser = payslip.organizationUser || {};
  const user = orgUser.user || {};
  const profile = row.employeeProfile || {};
  const employeeName =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || 'Employee';
  const periodLabel = `${run.month}/${run.year}`;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (d) => chunks.push(d));

  doc.fontSize(18).text('Webfudge Systems', { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(14).text(`Payslip - ${periodLabel}`);
  doc.moveDown(0.8);

  doc.fontSize(10).text(`Payslip No: ${payslip.payslipNumber}`);
  doc.text(`Employee: ${employeeName}`);
  doc.text(`Employee ID: ${profile.employeeCode || '-'}`);
  doc.text(`Department: ${orgUser.primaryDepartment?.name || '-'}`);
  doc.text(`Designation: ${profile.designation || '-'}`);
  doc.moveDown(0.8);

  doc.fontSize(12).text('Earnings', { underline: true });
  doc.fontSize(10);
  doc.text(`Basic: Rs ${Number(row.basic || 0).toLocaleString('en-IN')}`);
  doc.text(`HRA: Rs ${Number(row.hra || 0).toLocaleString('en-IN')}`);
  doc.text(`Special Allowance: Rs ${Number(row.specialAllowance || 0).toLocaleString('en-IN')}`);
  doc.text(`FBP: Rs ${Number(row.fbp || 0).toLocaleString('en-IN')}`);
  doc.text(`Gross: Rs ${Number(row.gross || 0).toLocaleString('en-IN')}`);
  doc.moveDown(0.8);

  doc.fontSize(12).text('Deductions', { underline: true });
  doc.fontSize(10);
  doc.text(`PF: Rs ${Number(row.pf || 0).toLocaleString('en-IN')}`);
  doc.text(`ESI: Rs ${Number(row.esi || 0).toLocaleString('en-IN')}`);
  doc.text(`PT: Rs ${Number(row.pt || 0).toLocaleString('en-IN')}`);
  doc.text(`TDS (Estimate): Rs ${Number(row.tds || 0).toLocaleString('en-IN')}`);
  doc.text(`Total Deductions: Rs ${Number(row.deductionsTotal || 0).toLocaleString('en-IN')}`);
  doc.moveDown(1);

  doc.fontSize(13).text(`Net Pay: Rs ${Number(row.net || 0).toLocaleString('en-IN')}`, { align: 'right' });
  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = (params) => {
  const core = base(params);

  return {
    ...core,

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
      if (relId(run.organization) !== ctx.state.orgId || relId(lineItem.organization) !== ctx.state.orgId) {
        return ctx.forbidden();
      }
      if (relId(lineItem.payrollRun) !== run.id) return ctx.badRequest('Line item does not belong to this payroll run');

      const existing = await strapi.entityService.findMany(UID, {
        filters: { payrollLineItem: lineItem.id, organization: ctx.state.orgId },
        limit: 1,
      });
      if (existing.length) {
        return { data: existing[0] };
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
      if (relId(payslip.organization) !== ctx.state.orgId) return ctx.forbidden();

      const pdfBuffer = await buildPayslipPdfBuffer(payslip);
      ctx.set('Content-Type', 'application/pdf');
      ctx.set('Content-Disposition', `attachment; filename=\"${payslip.payslipNumber}.pdf\"`);
      ctx.body = pdfBuffer;
    },
  };
};
