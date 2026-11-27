'use strict';

/** G14 cadences + booking pages. Auth via the global jwt-auth middleware; /booking/* is public. */
const C = 'api::crm-cadence.crm-cadence';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/crm-cadences', handler: `${C}.list`, config: authFalse },
    { method: 'POST', path: '/crm-cadences', handler: `${C}.create`, config: authFalse },
    { method: 'GET', path: '/crm-cadences/enrollments', handler: `${C}.listEnrollments`, config: authFalse },
    { method: 'POST', path: '/crm-cadences/enrollments/:id/stop', handler: `${C}.stopEnrollment`, config: authFalse },
    { method: 'POST', path: '/crm-cadences/leads/:leadId/replied', handler: `${C}.replied`, config: authFalse },
    { method: 'GET', path: '/crm-cadences/:id', handler: `${C}.findOne`, config: authFalse },
    { method: 'PUT', path: '/crm-cadences/:id', handler: `${C}.update`, config: authFalse },
    { method: 'DELETE', path: '/crm-cadences/:id', handler: `${C}.archive`, config: authFalse },
    { method: 'POST', path: '/crm-cadences/:id/enroll', handler: `${C}.enroll`, config: authFalse },
    { method: 'GET', path: '/crm-booking-pages/me', handler: `${C}.getMyPage`, config: authFalse },
    { method: 'PUT', path: '/crm-booking-pages/me', handler: `${C}.saveMyPage`, config: authFalse },
    { method: 'GET', path: '/booking/:slug', handler: `${C}.publicPage`, config: authFalse },
    { method: 'POST', path: '/booking/:slug', handler: `${C}.publicBook`, config: authFalse },
  ],
};
