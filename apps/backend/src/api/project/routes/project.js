'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET',    path: '/projects',           handler: 'api::project.project.find',    config: { auth: false } },
    { method: 'GET',    path: '/projects/:id',       handler: 'api::project.project.findOne', config: { auth: false } },
    { method: 'POST',   path: '/projects',           handler: 'api::project.project.create',  config: { auth: false } },
    { method: 'PUT',    path: '/projects/:id',       handler: 'api::project.project.update',  config: { auth: false } },
    { method: 'DELETE', path: '/projects/:id',       handler: 'api::project.project.delete',  config: { auth: false } },
    { method: 'GET',    path: '/projects/:id/summary', handler: 'api::project.project.summary', config: { auth: false } },
  ],
};
