'use strict';

/**
 * Pricing for per-app, per-user plans paid in advance (monthly or yearly).
 *
 *   new      — trial, free, expired or a plan/cycle change: a fresh period starts now.
 *              Unused value of a running paid period is credited.
 *   seats    — more users on the same plan and cycle: pay pro rata for the rest of the period.
 *   renewal  — same plan and cycle while the period is running: the next period is paid in advance.
 *
 * Prices in the catalogue exclude GST; GST is added on top.
 */

const { DAY } = require('./saas-access');

const GST_RATE = Number(process.env.BILLING_GST_RATE ?? 0.18);

const round2 = (n) => Math.round(n * 100) / 100;

function addPeriod(start, cycle) {
  const end = new Date(start);
  if (cycle === 'annual') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

/** Per-user price for one full period of the cycle. */
function perUserPeriodPrice(plan, cycle) {
  const monthly = Number(plan.pricePerUserMonthly) || 0;
  if (cycle === 'annual') {
    const discount = Number(plan.yearlyDiscountPercent ?? 15) / 100;
    return round2(monthly * 12 * (1 - discount));
  }
  return monthly;
}

class QuoteError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.details = details;
  }
}

/**
 * @param {object} args
 * @param {object} args.plan          plan row
 * @param {'monthly'|'annual'} args.cycle
 * @param {number} args.users         seats to pay for
 * @param {number} args.memberCount   active members in the organization
 * @param {object|null} args.subscription current subscription for the app
 * @param {object|null} args.lastPaid last paid payment for the subscription (for credit)
 */
function quote({ plan, cycle, users, memberCount, subscription, lastPaid, now = new Date() }) {
  if (!plan || plan.isActive === false) throw new QuoteError('This plan is not available.');
  if (!['monthly', 'annual'].includes(cycle)) throw new QuoteError('Choose monthly or yearly billing.');
  if (plan.code === 'free') throw new QuoteError('The Free plan needs no payment.');
  const seats = Math.floor(Number(users));
  if (!Number.isFinite(seats) || seats < 1) throw new QuoteError('Enter how many users you need.', { field: 'users' });
  if (seats < memberCount) {
    throw new QuoteError(`Your organization has ${memberCount} members, so pay for at least ${memberCount} users.`, { field: 'users', min: memberCount });
  }
  if (plan.maxUsers && seats > plan.maxUsers) {
    throw new QuoteError(`The ${plan.name} plan allows up to ${plan.maxUsers} users.`, { field: 'users', max: plan.maxUsers });
  }

  const unit = perUserPeriodPrice(plan, cycle);
  const sub = subscription;
  const paidAndRunning =
    sub && sub.status === 'active' && sub.planCode && !['free', 'trial'].includes(sub.planCode) &&
    sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now;
  const samePlan = paidAndRunning && sub.planCode === plan.code && (sub.billingCycle || 'monthly') === cycle;

  let kind = 'new';
  let periodStart = now;
  let periodEnd = addPeriod(now, cycle);
  let subtotal = round2(unit * seats);
  let credit = 0;
  let description = `${plan.name} · ${seats} user${seats === 1 ? '' : 's'} · ${cycle === 'annual' ? '1 year' : '1 month'}`;

  if (samePlan && seats > (sub.totalUsers || 0)) {
    kind = 'seats';
    periodStart = new Date(sub.currentPeriodStart || now);
    periodEnd = new Date(sub.currentPeriodEnd);
    const total = periodEnd - periodStart || 1;
    const remaining = Math.max(0, periodEnd - now);
    const extra = seats - (sub.totalUsers || 0);
    subtotal = round2(unit * extra * (remaining / total));
    description = `${plan.name} · ${extra} extra user${extra === 1 ? '' : 's'} until ${periodEnd.toDateString()}`;
  } else if (samePlan) {
    kind = 'renewal';
    periodStart = new Date(sub.currentPeriodEnd);
    periodEnd = addPeriod(periodStart, cycle);
    description = `${description} · from ${periodStart.toDateString()}`;
  } else if (paidAndRunning && lastPaid) {
    const start = new Date(lastPaid.periodStart || sub.currentPeriodStart || now);
    const end = new Date(sub.currentPeriodEnd);
    const fraction = Math.max(0, Math.min(1, (end - now) / ((end - start) || 1)));
    credit = Math.min(subtotal, round2(Number(lastPaid.amountSubtotal || 0) * fraction));
  }

  const taxable = round2(Math.max(0, subtotal - credit));
  const tax = round2(taxable * GST_RATE);
  const total = round2(taxable + tax);
  return {
    kind,
    planCode: plan.code,
    planName: plan.name,
    cycle,
    users: seats,
    unitPrice: unit,
    subtotal,
    credit,
    taxRate: GST_RATE,
    tax,
    total,
    amountPaise: Math.round(total * 100),
    periodStart,
    periodEnd,
    description,
  };
}

function invoiceNumber(payment) {
  const year = new Date(payment.paidAt || Date.now()).getFullYear();
  return `WF-${year}-${String(payment.id).padStart(6, '0')}`;
}

module.exports = { GST_RATE, DAY, round2, addPeriod, perUserPeriodPrice, quote, QuoteError, invoiceNumber };
