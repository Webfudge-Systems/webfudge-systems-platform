'use strict';

/**
 * W16 AI project planner (Fudge Work). Lives under /projects so the SaaS app-access middleware and
 * the API cache treat it like the rest of the project API (Work plan required; creating invalidates
 * the org's cached project lists). Auth, org, permissions and the AI gate are checked in the controller.
 */
const UID = 'api::ai-planner.ai-planner';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'POST', path: '/projects/ai-plan', handler: `${UID}.generate`, config: authFalse },
    { method: 'POST', path: '/projects/ai-plan/create', handler: `${UID}.create`, config: authFalse },
  ],
};
