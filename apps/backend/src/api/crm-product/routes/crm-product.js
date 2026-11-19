'use strict';

/** Product catalogue + price books (G13). Auth via global jwt-auth middleware. */
const UID = 'api::crm-product.crm-product';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/crm-products', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/crm-products', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/crm-products/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/crm-products/:id', handler: `${UID}.delete`, config: authFalse },
    { method: 'GET', path: '/crm-price-books', handler: `${UID}.listPriceBooks`, config: authFalse },
    { method: 'POST', path: '/crm-price-books', handler: `${UID}.createPriceBook`, config: authFalse },
    { method: 'PUT', path: '/crm-price-books/:id', handler: `${UID}.updatePriceBook`, config: authFalse },
    { method: 'DELETE', path: '/crm-price-books/:id', handler: `${UID}.deletePriceBook`, config: authFalse },
    { method: 'POST', path: '/crm-quotes/calculate', handler: `${UID}.calculate`, config: authFalse },
  ],
};
