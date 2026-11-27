'use strict';

/** Goals / OKRs (W12). Auth via global jwt-auth middleware. */
const C = 'api::goal.goal';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/goals/objectives', handler: `${C}.listObjectives`, config: authFalse },
    { method: 'POST', path: '/goals/objectives', handler: `${C}.createObjective`, config: authFalse },
    { method: 'GET', path: '/goals/objectives/:id', handler: `${C}.getObjective`, config: authFalse },
    { method: 'PUT', path: '/goals/objectives/:id', handler: `${C}.updateObjective`, config: authFalse },
    { method: 'DELETE', path: '/goals/objectives/:id', handler: `${C}.deleteObjective`, config: authFalse },
    { method: 'POST', path: '/goals/objectives/:id/key-results', handler: `${C}.createKeyResult`, config: authFalse },
    { method: 'PUT', path: '/goals/key-results/:id', handler: `${C}.updateKeyResult`, config: authFalse },
    { method: 'DELETE', path: '/goals/key-results/:id', handler: `${C}.deleteKeyResult`, config: authFalse },
    { method: 'GET', path: '/goals/key-results/:id/check-ins', handler: `${C}.listCheckIns`, config: authFalse },
    { method: 'POST', path: '/goals/key-results/:id/check-ins', handler: `${C}.createCheckIn`, config: authFalse },
    { method: 'GET', path: '/goals/linked', handler: `${C}.linked`, config: authFalse },
  ],
};
