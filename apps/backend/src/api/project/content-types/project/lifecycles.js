'use strict';

/**
 * W1: every project belongs to a workspace and has a default task list.
 * Projects created without a workspace (templates, won-deal projects, old clients)
 * go to the org's default "General" workspace. Best-effort: never blocks a create.
 */
const { relId, ensureDefaultWorkspace, ensureDefaultTaskList } = require('../../../../utils/workspaces');

module.exports = {
  async beforeCreate(event) {
    try {
      const data = event.params?.data;
      if (!data || relId(data.workspace)) return;
      const orgId = relId(data.organization);
      if (!orgId) return;
      const wsId = await ensureDefaultWorkspace(strapi, orgId);
      if (wsId) data.workspace = wsId;
    } catch (e) {
      strapi.log.warn(`[workspaces] default workspace not set on project create: ${e?.message || e}`);
    }
  },

  async afterCreate(event) {
    try {
      const id = event.result?.id;
      if (id) await ensureDefaultTaskList(strapi, id);
    } catch (e) {
      strapi.log.warn(`[workspaces] default list not created for project: ${e?.message || e}`);
    }
  },
};
