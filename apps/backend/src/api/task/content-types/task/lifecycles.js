'use strict';

/**
 * Task lifecycle hooks.
 * W12 Goals: task-based key results follow their linked tasks. Any write that changes a task's
 * status, projects or parent (or creates / deletes a task) recomputes the affected key results.
 * The helpers never throw, so a goal recompute can't break a task write.
 */

const GOAL_FIELDS = ['status', 'projects', 'parent'];
const touchesGoals = (data) => !!data && GOAL_FIELDS.some((k) => Object.prototype.hasOwnProperty.call(data, k));

const goals = () => require('../../../../utils/goals');
const whereId = (where) => {
  const id = where && (where.id ?? where.documentId);
  return typeof id === 'number' || /^\d+$/.test(String(id)) ? Number(id) : null;
};

async function projectIdsOf(id) {
  const t = await strapi.entityService.findOne('api::task.task', id, { fields: ['id'], populate: { projects: { fields: ['id'] } } });
  return (t?.projects || []).map((p) => p.id);
}

module.exports = {
  async beforeUpdate(event) {
    if (!touchesGoals(event.params?.data)) return;
    const id = whereId(event.params?.where);
    if (!id) return;
    try {
      event.state = { ...(event.state || {}), goalsOldProjects: await projectIdsOf(id) };
    } catch {
      /* best effort */
    }
  },

  async afterUpdate(event) {
    if (!touchesGoals(event.params?.data)) return;
    const id = event.result?.id ?? whereId(event.params?.where);
    if (!id) return;
    const before = event.state?.goalsOldProjects || [];
    let after = [];
    try {
      after = await projectIdsOf(id);
    } catch {
      /* best effort */
    }
    await goals().onTaskChanged(strapi, id, [...new Set([...before, ...after])]);
  },

  async afterCreate(event) {
    const id = event.result?.id;
    if (id) await goals().onTaskChanged(strapi, id);
  },

  async beforeDelete(event) {
    const id = whereId(event.params?.where);
    if (!id) return;
    try {
      const krIds = await goals().keyResultIdsForTask(strapi, id, await projectIdsOf(id));
      event.state = { ...(event.state || {}), goalsKeyResults: krIds };
    } catch {
      /* best effort */
    }
  },

  async afterDelete(event) {
    for (const krId of event.state?.goalsKeyResults || []) {
      try {
        await goals().recomputeTaskKeyResult(strapi, krId);
      } catch (e) {
        strapi.log.warn(`[goals] key result ${krId} recompute after task delete failed: ${e?.message || e}`);
      }
    }
  },
};
