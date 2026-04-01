'use strict';

const UID = 'api::client-account.client-account';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET',    path: '/client-accounts',     handler: `${UID}.find`,    config: authFalse },
    { method: 'GET',    path: '/client-accounts/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'POST',   path: '/client-accounts',     handler: `${UID}.create`,  config: authFalse },
    { method: 'PUT',    path: '/client-accounts/:id', handler: `${UID}.update`,  config: authFalse },
    { method: 'DELETE', path: '/client-accounts/:id', handler: `${UID}.delete`,  config: authFalse },
  ],
};
