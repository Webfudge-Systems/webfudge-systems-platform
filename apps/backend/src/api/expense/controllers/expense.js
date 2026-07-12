'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');
const { generateSequence } = require('../../../utils/sequence');
const { createAutoJournal, EXPENSE_CATEGORY_TO_ACCOUNT } = require('../../../utils/auto-journal');
const { isHrAdmin } = require('../../../utils/hr-self-scope');

const UID = 'api::expense.expense';

const base = makeBooksCrudController(UID, {
  defaultPopulate: ['vendor', 'project', 'customer', 'submittedBy', 'approvedBy'],
});

function expenseAccountCode(category) {
  return EXPENSE_CATEGORY_TO_ACCOUNT[category] || '6010';
}

async function loadExpenseForOrg(id, orgId) {
  const expense = await strapi.entityService.findOne(UID, id, {
    populate: ['organization', 'submittedBy', 'approvedBy'],
  });
  if (!expense) return null;
  if (relId(expense.organization) !== orgId) return { forbidden: true };
  return expense;
}

async function postApprovalJournal(expense, orgId, userId) {
  const amount = parseInt(expense.amount, 10) || 0;
  if (amount <= 0) return;
  const accountCode = expenseAccountCode(expense.category);
  const journalDate = expense.expenseDate || new Date().toISOString().split('T')[0];
  await createAutoJournal({
    organizationId: orgId,
    userId,
    sourceType: 'expense',
    sourceId: expense.id,
    journalDate,
    lines: [
      {
        accountCode,
        accountName: 'Expense',
        description: expense.description || expense.expenseNumber,
        debit: amount,
        credit: 0,
      },
      {
        accountCode: '2001',
        accountName: 'Accounts Payable',
        description: `Reimbursement ${expense.expenseNumber}`,
        debit: 0,
        credit: amount,
      },
    ],
  });
}

async function createReimbursementPayment(expense, orgId, userId, body = {}) {
  const amount = parseInt(expense.amount, 10) || 0;
  if (amount <= 0) return null;
  const paymentNumber = await generateSequence(orgId, 'paymentSequence', 'PMADE');
  const paymentDate = body.paymentDate || new Date().toISOString().split('T')[0];
  const paymentMode = body.paymentMode || expense.paymentMode || 'bank_transfer';

  return strapi.entityService.create('api::payment-made.payment-made', {
    data: {
      paymentNumber,
      paymentDate,
      amount,
      paymentMode,
      referenceNumber: body.referenceNumber || expense.expenseNumber,
      notes: body.notes || `Employee reimbursement for ${expense.expenseNumber}`,
      organization: orgId,
      createdByUser: userId,
    },
  });
}

async function postReimbursementJournal(expense, payment, orgId, userId) {
  const amount = parseInt(expense.amount, 10) || 0;
  if (amount <= 0) return;
  const journalDate = payment?.paymentDate || new Date().toISOString().split('T')[0];
  const ref = expense.expenseNumber || payment?.paymentNumber || 'reimbursement';
  await createAutoJournal({
    organizationId: orgId,
    userId,
    sourceType: 'payment-made',
    sourceId: payment?.id || expense.id,
    journalDate,
    lines: [
      {
        accountCode: '2001',
        accountName: 'Accounts Payable',
        description: `Reimbursement ${ref}`,
        debit: amount,
        credit: 0,
      },
      {
        accountCode: '1001',
        accountName: 'Cash',
        description: `Reimbursement ${ref}`,
        debit: 0,
        credit: amount,
      },
    ],
  });
}

module.exports = (params) => {
  const core = base(params);

  return {
    ...core,

    async find(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const q = ctx.query || {};
      const page = parseInt(q.page || '1', 10);
      const limit = Math.min(parseInt(q.limit || '200', 10), 200);
      const filters = { organization: ctx.state.orgId };
      if (q.status) filters.status = q.status;
      if (q.category) filters.category = q.category;
      if (q.billable !== undefined) filters.billable = q.billable === 'true';
      if (q.invoiced !== undefined) filters.invoiced = q.invoiced === 'true';
      if (q.reimbursable !== undefined) filters.reimbursable = q.reimbursable === 'true';
      if (q.project) filters.project = q.project;
      if (q.vendor) filters.vendor = q.vendor;
      if (q.from) filters.expenseDate = { ...filters.expenseDate, $gte: q.from };
      if (q.to) filters.expenseDate = { ...filters.expenseDate, $lte: q.to };
      if (!isHrAdmin(ctx)) {
        filters.submittedBy = ctx.state.user.id;
      } else if (q.submittedBy) {
        filters.submittedBy = q.submittedBy;
      }

      const [results, total] = await Promise.all([
        strapi.entityService.findMany(UID, {
          filters,
          start: (page - 1) * limit,
          limit,
          sort: { createdAt: 'desc' },
          populate: ['vendor', 'project', 'submittedBy', 'approvedBy'],
        }),
        strapi.db.query(UID).count({ where: filters }),
      ]);
      return {
        data: results,
        meta: { pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } },
      };
    },

    async create(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const body = ctx.request?.body || {};
      const payload = body.data || body;
      const expenseNumber = await generateSequence(ctx.state.orgId, 'expenseSequence', 'EXP');
      const reimbursable = payload.reimbursable !== false;
      const status = reimbursable ? 'submitted' : (payload.status || 'draft');
      const submittedById = isHrAdmin(ctx) ? (payload.submittedBy || ctx.state.user.id) : ctx.state.user.id;

      const expense = await strapi.entityService.create(UID, {
        data: {
          ...payload,
          expenseNumber,
          status,
          reimbursable,
          submittedBy: submittedById,
          organization: ctx.state.orgId,
          createdByUser: ctx.state.user.id,
        },
        populate: ['submittedBy', 'approvedBy'],
      });

      // Direct (non-reimbursable) company expenses post to books immediately.
      if (!reimbursable && status !== 'draft') {
        try {
          const accountCode = expenseAccountCode(payload.category);
          const today = payload.expenseDate || new Date().toISOString().split('T')[0];
          await createAutoJournal({
            organizationId: ctx.state.orgId,
            userId: ctx.state.user.id,
            sourceType: 'expense',
            sourceId: expense.id,
            journalDate: today,
            lines: [
              {
                accountCode,
                accountName: 'Expense',
                description: payload.description || expense.expenseNumber,
                debit: parseInt(payload.amount, 10),
                credit: 0,
              },
              {
                accountCode: '1001',
                accountName: 'Cash',
                description: payload.description || expense.expenseNumber,
                debit: 0,
                credit: parseInt(payload.amount, 10),
              },
            ],
          });
        } catch (err) {
          console.warn('[expense] Auto-journal failed:', err.message);
        }
      }

      return { data: expense };
    },

    async update(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const expense = await loadExpenseForOrg(ctx.params.id, ctx.state.orgId);
      if (!expense) return ctx.notFound();
      if (expense.forbidden) return ctx.forbidden();
      if (!isHrAdmin(ctx) && relId(expense.submittedBy) !== ctx.state.user.id) return ctx.forbidden();
      if (!isHrAdmin(ctx) && expense.status !== 'submitted') {
        return ctx.badRequest('Only pending claims can be edited');
      }
      return core.update(ctx);
    },

    async delete(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      const expense = await loadExpenseForOrg(ctx.params.id, ctx.state.orgId);
      if (!expense) return ctx.notFound();
      if (expense.forbidden) return ctx.forbidden();
      if (!isHrAdmin(ctx) && relId(expense.submittedBy) !== ctx.state.user.id) return ctx.forbidden();
      if (!isHrAdmin(ctx) && expense.status !== 'submitted') {
        return ctx.badRequest('Only pending claims can be deleted');
      }
      return core.delete(ctx);
    },

    async approve(ctx) {
      if (!isHrAdmin(ctx)) return ctx.forbidden('HR approval required');
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const expense = await loadExpenseForOrg(ctx.params.id, ctx.state.orgId);
      if (!expense) return ctx.notFound();
      if (expense.forbidden) return ctx.forbidden();
      if (expense.status !== 'submitted') return ctx.badRequest('Only submitted claims can be approved');

      const updated = await strapi.entityService.update(UID, expense.id, {
        data: { status: 'approved', approvedBy: ctx.state.user.id },
        populate: ['submittedBy', 'approvedBy'],
      });

      try {
        await postApprovalJournal(updated, ctx.state.orgId, ctx.state.user.id);
      } catch (err) {
        console.warn('[expense] Approval journal failed:', err.message);
      }

      return { data: updated };
    },

    async reject(ctx) {
      if (!isHrAdmin(ctx)) return ctx.forbidden('HR approval required');
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const expense = await loadExpenseForOrg(ctx.params.id, ctx.state.orgId);
      if (!expense) return ctx.notFound();
      if (expense.forbidden) return ctx.forbidden();
      if (expense.status !== 'submitted') return ctx.badRequest('Only submitted claims can be rejected');

      const body = ctx.request?.body || {};
      const payload = body.data || body;
      const updated = await strapi.entityService.update(UID, expense.id, {
        data: {
          status: 'rejected',
          approvedBy: ctx.state.user.id,
          description: payload.reason
            ? `${expense.description || ''}\n[Rejected] ${payload.reason}`.trim()
            : expense.description,
        },
        populate: ['submittedBy', 'approvedBy'],
      });

      return { data: updated };
    },

    async reimburse(ctx) {
      if (!isHrAdmin(ctx)) return ctx.forbidden('HR reimbursement required');
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const expense = await loadExpenseForOrg(ctx.params.id, ctx.state.orgId);
      if (!expense) return ctx.notFound();
      if (expense.forbidden) return ctx.forbidden();
      if (expense.status !== 'approved') return ctx.badRequest('Only approved claims can be reimbursed');

      const body = ctx.request?.body || {};
      const payload = body.data || body;

      let payment = null;
      try {
        payment = await createReimbursementPayment(expense, ctx.state.orgId, ctx.state.user.id, payload);
        await postReimbursementJournal(expense, payment, ctx.state.orgId, ctx.state.user.id);
      } catch (err) {
        console.warn('[expense] Reimbursement payment failed:', err.message);
      }

      const updated = await strapi.entityService.update(UID, expense.id, {
        data: {
          status: 'reimbursed',
          paymentMode: payload.paymentMode || expense.paymentMode || 'bank_transfer',
          referenceNumber: payload.referenceNumber || expense.referenceNumber,
        },
        populate: ['submittedBy', 'approvedBy'],
      });

      return { data: { expense: updated, payment } };
    },

    async addToInvoice(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const expense = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization'] });
      if (!expense) return ctx.notFound();
      if (relId(expense.organization) !== ctx.state.orgId) return ctx.forbidden();
      if (expense.invoiced) return ctx.badRequest('Expense already invoiced');

      const body = ctx.request?.body || {};
      const { invoiceId } = body.data || body;
      if (!invoiceId) return ctx.badRequest('invoiceId required');

      const invoice = await strapi.entityService.findOne('api::invoice.invoice', invoiceId, {
        populate: ['organization'],
      });
      if (!invoice || relId(invoice.organization) !== ctx.state.orgId) return ctx.notFound();

      await strapi.entityService.create('api::invoice-line-item.invoice-line-item', {
        data: {
          description: expense.description || expense.category,
          quantity: 1,
          rate: expense.amount,
          amount: expense.amount,
          discountPercent: 0,
          taxRate: 0,
          taxAmount: 0,
          total: expense.amount,
          invoice: invoiceId,
          organization: ctx.state.orgId,
        },
      });

      const allLi = await strapi.entityService.findMany('api::invoice-line-item.invoice-line-item', {
        filters: { invoice: invoiceId },
      });
      const newTotal = allLi.reduce((s, li) => s + (li.total || 0), 0);
      await strapi.entityService.update('api::invoice.invoice', invoiceId, {
        data: { subtotal: newTotal, total: newTotal, balanceDue: newTotal - (invoice.paidAmount || 0) },
      });

      await strapi.entityService.update(UID, ctx.params.id, {
        data: { invoiced: true, invoicedOn: new Date().toISOString(), invoice: invoiceId },
      });

      return { data: { success: true } };
    },
  };
};
