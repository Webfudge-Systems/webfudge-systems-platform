'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET',    path: '/tasks',                    handler: 'api::task.task.find',       config: { auth: false } },
    { method: 'GET',    path: '/tasks/:id',                handler: 'api::task.task.findOne',    config: { auth: false } },
    { method: 'POST',   path: '/tasks',                    handler: 'api::task.task.create',     config: { auth: false } },
    { method: 'PUT',    path: '/tasks/:id',                handler: 'api::task.task.update',     config: { auth: false } },
    { method: 'DELETE', path: '/tasks/:id',                handler: 'api::task.task.delete',     config: { auth: false } },
    { method: 'POST',   path: '/tasks/:id/timer/start',   handler: 'api::task.task.timerStart', config: { auth: false } },
    { method: 'POST',   path: '/tasks/:id/timer/stop',    handler: 'api::task.task.timerStop',  config: { auth: false } },
  ],
};
