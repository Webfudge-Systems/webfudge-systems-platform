'use strict';

// Auth is checked inside the controller. The webhook is verified by its Razorpay signature.
const route = (method, path, handler) => ({
  method,
  path,
  handler: `billing.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/billing/organizations/:id', 'summary'),
    route('POST', '/billing/quote', 'quote'),
    route('POST', '/billing/checkout', 'checkout'),
    route('POST', '/billing/verify', 'verify'),
    route('POST', '/billing/webhook', 'webhook'),
    route('POST', '/billing/organizations/:id/free', 'chooseFree'),
    route('POST', '/billing/organizations/:id/cancel', 'cancel'),
    route('PUT', '/billing/organizations/:id/details', 'updateDetails'),
    route('GET', '/billing/invoices/:paymentId', 'invoice'),
  ],
};
