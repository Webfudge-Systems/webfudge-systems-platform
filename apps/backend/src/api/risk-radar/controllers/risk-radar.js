'use strict';

/**
 * Risk radar (ticket W19, SaaS only, plan feature pm.risk_radar).
 *
 *   GET  /risk-radar/projects/:id          → radar for one project (deterministic, no credits)
 *   GET  /risk-radar/portfolio             → one line per visible active project, riskiest first
 *   POST /risk-radar/projects/:id/explain  → Fudge AI explanation + recommended actions (metered)
 *
 * The radar itself is computed in utils/risk-radar.js from sprint velocity (W7), dependency chains
 * (W2), workload/capacity (W6), due dates and overdue tasks. Only the explanation uses AI.
 */

const { renderTemplate, generateObject } = require('@webfudge/ai');
const { isSaas } = require('../../../utils/platform');
const { requireFeature } = require('../../../utils/saas-plans');
const { requireModuleAccess, canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');
const { loadProjectForAccess, buildProjectVisibilityFilters } = require('../../../utils/workspaces');
const { radarForProjects, redactForMember } = require('../../../utils/risk-radar-loader');
const ai = require('../../../utils/ai');

const PROJECT_UID = 'api::project.project';
const FEATURE = 'pm.risk_radar';
const CLOSED_PROJECT = ['COMPLETED', 'CANCELLED', 'ARCHIVED'];
const LEVEL_RANK = { high: 0, medium: 1, low: 2 };
const PROJECT_FIELDS = ['id', 'name', 'slug', 'status', 'startDate', 'endDate'];
const PROJECT_POPULATE = { projectManager: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] }, teamMembers: { fields: ['id'] } };

const isManager = (ctx, project) =>
  isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'manage') || (project && Number(project.projectManager?.id) === Number(ctx.state.user.id));

/** Common gate: SaaS, signed in, org, Work projects read, plan feature. Returns false after answering. */
async function gate(ctx) {
  if (!isSaas()) {
    ctx.notFound('Not available');
    return false;
  }
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  if (requireModuleAccess(ctx, 'pm', 'projects', 'read')) return false;
  return requireFeature(ctx, strapi, FEATURE);
}

async function loadProject(ctx) {
  const access = await loadProjectForAccess(strapi, ctx, parseInt(String(ctx.params.id), 10));
  if (!access) return null;
  return strapi.entityService.findOne(PROJECT_UID, access.id, { fields: PROJECT_FIELDS, populate: PROJECT_POPULATE });
}

async function projectRadar(ctx, project) {
  const radar = (await radarForProjects(strapi, ctx.state.orgId, [project])).get(project.id);
  const manager = isManager(ctx, project);
  return { radar: manager ? radar : redactForMember(radar), manager };
}

module.exports = {
  async project(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const project = await loadProject(ctx);
    if (!project) return ctx.notFound('Project not found');
    const { radar, manager } = await projectRadar(ctx, project);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { data: { project: { id: project.id, name: project.name, endDate: project.endDate }, ...radar }, meta: { manager, aiEnabled: ai.aiEnabled() } };
    return ctx.body;
  },

  async portfolio(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const filters = await buildProjectVisibilityFilters(strapi, ctx, ctx.state.orgId, ctx.state.user.id);
    let projects = await strapi.entityService.findMany(PROJECT_UID, { filters, fields: PROJECT_FIELDS, populate: PROJECT_POPULATE, limit: 300 });
    projects = projects.filter((p) => !CLOSED_PROJECT.includes(String(p.status || '').toUpperCase()));
    const radars = await radarForProjects(strapi, ctx.state.orgId, projects);
    const rows = projects
      .map((p) => {
        const r = radars.get(p.id);
        return {
          id: p.id,
          slug: p.slug || null,
          name: p.name,
          level: r.level,
          reasons: r.reasons,
          endDate: r.forecast.endDate,
          projectedFinish: r.forecast.projectedFinish,
          slipDays: r.forecast.slipDays,
          method: r.forecast.method,
          counts: r.counts,
          topTasks: r.tasks.slice(0, 3).map((t) => ({ id: t.id, name: t.name, level: t.level, reason: t.reasons[0] })),
          reassignments: isManager(ctx, p) ? r.reassignments.length : 0,
        };
      })
      .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || (b.slipDays || 0) - (a.slipDays || 0) || b.counts.high - a.counts.high || a.name.localeCompare(b.name));
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      data: {
        projects: rows,
        summary: {
          total: rows.length,
          high: rows.filter((r) => r.level === 'high').length,
          medium: rows.filter((r) => r.level === 'medium').length,
          low: rows.filter((r) => r.level === 'low').length,
          slipping: rows.filter((r) => (r.slipDays || 0) > 0).length,
          reassignments: rows.reduce((a, r) => a + r.reassignments, 0),
        },
      },
    };
    return ctx.body;
  },

  /** Fudge AI reads the radar and explains it in plain words with what to do next. Read-only: nothing is changed. */
  async explain(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const project = await loadProject(ctx);
    if (!project) return ctx.notFound('Project not found');
    try {
      const { radar } = await projectRadar(ctx, project);
      const compact = {
        project: { name: project.name, endDate: radar.forecast.endDate },
        level: radar.level,
        reasons: radar.reasons,
        forecast: radar.forecast,
        riskyTasks: radar.tasks.slice(0, 12).map((t) => ({ name: t.name, due: t.due, level: t.level, reasons: t.reasons, assignee: t.assignee?.name || null })),
        overdueChains: radar.chains.slice(0, 5).map((c) => ({ late: c.root.name, daysOverdue: c.root.daysOverdue, blocks: c.blocked.map((b) => b.name) })),
        reassignments: radar.reassignments.map((r) => ({ task: r.taskName, from: r.from?.name || null, to: r.to.name, reason: r.reason })),
      };
      const t = renderTemplate('work.risk_explain', { radar: compact, today: radar.today }, { language: ctx.request.body?.language });
      const out = await generateObject(ai.clientFor(strapi, ctx), { ...t, feature: 'work.risk_explain', metadata: { subjectType: 'project', subjectId: project.id } });
      ctx.body = { data: { ...out.object, language: t.language, model: out.model, creditsUsed: out.credits, credits: await ai.creditStatus(strapi, ctx.state.orgId) } };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },
};
