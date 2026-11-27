'use strict';

/**
 * Vertical packs (G22, SaaS only). Data in utils/vertical-packs/, logic in utils/vertical-pack-apply.js.
 *
 * GET  /crm-vertical-packs               packs + the one this org applied last
 * GET  /crm-vertical-packs/:key/preview  what applying would add / skip (no writes)
 * POST /crm-vertical-packs/:key/apply    adds the pack (idempotent, never deletes); CRM settings manage
 */

const { isSaas } = require('../../../utils/platform');
const { requireModuleAccess, requireAppSettingsManage } = require('../../../utils/rbac');
const { listPacks, getPack } = require('../../../utils/vertical-packs');
const { applyVerticalPack, appliedPack } = require('../../../utils/vertical-pack-apply');

function guard(ctx) {
  if (!isSaas()) {
    ctx.notFound('Vertical packs are available in Webfudge SaaS');
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
  return true;
}

module.exports = {
  async list(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    ctx.set('Cache-Control', 'no-store');
    ctx.send({ data: listPacks(), applied: await appliedPack(strapi, ctx.state.orgId) });
  },

  async preview(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    if (!getPack(ctx.params.key)) return ctx.notFound('Unknown vertical pack');
    ctx.set('Cache-Control', 'no-store');
    const summary = await applyVerticalPack(strapi, {
      orgId: ctx.state.orgId,
      userId: ctx.state.user.id,
      packKey: ctx.params.key,
      dryRun: true,
    });
    ctx.send({ data: summary });
  },

  async apply(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    if (!getPack(ctx.params.key)) return ctx.notFound('Unknown vertical pack');
    const summary = await applyVerticalPack(strapi, {
      orgId: ctx.state.orgId,
      userId: ctx.state.user.id,
      packKey: ctx.params.key,
    });
    ctx.send({ data: summary });
  },
};
