'use strict';

/**
 * Minimal Razorpay client over the REST API (no SDK).
 *
 *   RAZORPAY_KEY_ID          — public key id (rzp_test_… or rzp_live_…), also sent to the browser
 *   RAZORPAY_KEY_SECRET      — secret, server only
 *   RAZORPAY_WEBHOOK_SECRET  — secret set on the webhook in the Razorpay dashboard
 *
 * Until the keys are set, billing endpoints answer "payments are not set up yet".
 */

const crypto = require('crypto');

// RAZORPAY_API_BASE is only for pointing tests at a local mock.
const API = process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com/v1';

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function keyId() {
  return process.env.RAZORPAY_KEY_ID || null;
}

function isTestMode() {
  return String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_');
}

async function request(method, path, body) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.description || `Razorpay request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.razorpay = data?.error;
    throw error;
  }
  return data;
}

/** amount is in paise. */
function createOrder({ amount, receipt, notes }) {
  return request('POST', '/orders', { amount, currency: 'INR', receipt, notes });
}

function safeEqualHex(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** Signature Checkout returns after a successful payment. */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqualHex(expected, signature);
}

/** X-Razorpay-Signature on webhooks, computed over the raw request body. */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

module.exports = {
  isConfigured,
  keyId,
  isTestMode,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
