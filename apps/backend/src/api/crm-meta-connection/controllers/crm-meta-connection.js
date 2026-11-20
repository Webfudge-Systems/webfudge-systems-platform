'use strict';

/**
 * Meta Lead Ads capture (ticket G6). SaaS only: every route is a 404 on the Internal deployment.
 *
 * Settings flow (Grow → Settings → Meta Lead Ads, settings-manage permission):
 *   POST /crm-meta/connect        → Facebook Login URL (signed state = org + user)
 *   GET  /crm-meta/oauth/callback → Meta redirects here; stores the long-lived user token (encrypted)
 *   GET  /crm-meta/pages          → Pages the user manages (id + name only)
 *   POST /crm-meta/page           → choose the Page; stores its token, subscribes it to leadgen
 *   GET  /crm-meta/forms          → the Page's lead forms + questions + saved mapping
 *   PUT  /crm-meta/forms          → which forms to capture and each form's question → field mapping
 *   POST /crm-meta/backfill       → import recent leads from chosen forms (dedupe makes it safe)
 *   DELETE /crm-meta/connection   → unsubscribe + forget tokens
 * Meta → us:
 *   GET  /crm-meta/webhook        → verify-token handshake
 *   POST /crm-meta/webhook        → X-Hub-Signature-256 verified lead notifications
 */

const { createCoreController } = require('@strapi/strapi').factories;
const meta = require('@webfudge/meta-ads');
const { isSaas } = require('../../../utils/platform');
const { requireAppSettingsManage } = require('../../../utils/rbac');
const { getOrgAccess } = require('../../../utils/saas-access');
const { listFields } = require('../../../utils/crm-custom-fields');
const {
  CONNECTION_UID,
  MAX_BACKFILL,
  metaConfig,
  missingConfig,
  encryptToken,
  decryptToken,
  clientFor,
  getConnection,
  getConnectionByPage,
  publicConnection,
  recordError,
  ingestLead,
  invalidateOrgCache,
} = require('../../../utils/meta-lead-ads');

const MAX_FORMS = 50;

function notFound(ctx) {
  ctx.status = 404;
  ctx.body = { data: null, error: { status: 404, name: 'NotFoundError', message: 'Not Found' } };
}

/** Member of the active org; `manage` also needs CRM/PM settings manage. Returns false when it already responded. */
function guard(ctx, { manage = true } = {}) {
  if (!isSaas()) {
    notFound(ctx);
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
  if (manage && requireAppSettingsManage(ctx)) return false;
  return true;
}

function requireConfigured(ctx, cfg) {
  const missing = missingConfig(cfg);
  if (!missing.length) return true;
  ctx.status = 503;
  ctx.body = {
    data: null,
    error: { status: 503, name: 'NotConfigured', message: 'Meta Lead Ads is not set up on this server yet.', details: { code: 'META_NOT_CONFIGURED' } },
  };
  return false;
}

/** Translate Graph errors into a safe message; auth errors mean the org must reconnect. */
function graphError(ctx, err) {
  if (err instanceof meta.MetaApiError) {
    const message = err.isAuthError
      ? 'Meta rejected the saved login (expired or permission removed). Reconnect your Facebook account.'
      : `Meta returned an error: ${err.message}`;
    return ctx.badRequest(message, { code: err.isAuthError ? 'META_RECONNECT' : 'META_GRAPH_ERROR', metaCode: err.code });
  }
  throw err;
}

function rawQuery(ctx) {
  return Object.fromEntries(new URLSearchParams(ctx.request.querystring || ''));
}

function redirectToCrm(ctx, cfg, params) {
  const url = new URL(`${cfg.crmUrl}/settings/meta-lead-ads`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  ctx.redirect(url.toString());
}

function questionsOf(form) {
  return (form.questions || [])
    .filter((q) => q && q.key)
    .map((q) => ({ key: String(q.key), label: q.label || q.key, type: q.type || null }));
}

module.exports = createCoreController(CONNECTION_UID, ({ strapi }) => ({
  // ─── Webhook ───────────────────────────────────────────────────────────────

  async webhookVerify(ctx) {
    if (!isSaas()) return notFound(ctx);
    const cfg = metaConfig();
    const result = meta.verifyWebhookChallenge(rawQuery(ctx), cfg.verifyToken);
    if (!result.ok) {
      ctx.status = 403;
      ctx.body = 'Forbidden';
      return;
    }
    ctx.type = 'text/plain';
    ctx.body = result.challenge;
  },

  async webhookReceive(ctx) {
    if (!isSaas()) return notFound(ctx);
    const cfg = metaConfig();
    const raw = ctx.request.body?.[Symbol.for('unparsedBody')];
    if (!meta.verifyWebhookSignature(raw, ctx.request.headers['x-hub-signature-256'], cfg.appSecret)) {
      strapi.log.warn('[meta-lead-ads] webhook rejected: bad or missing X-Hub-Signature-256');
      ctx.status = 401;
      ctx.body = { ok: false };
      return;
    }
    let payload;
    try {
      payload = typeof raw === 'string' || Buffer.isBuffer(raw) ? JSON.parse(String(raw)) : ctx.request.body;
    } catch (_) {
      ctx.status = 400;
      ctx.body = { ok: false };
      return;
    }

    const counts = { created: 0, duplicate: 0, matched: 0, skipped: 0, failed: 0 };
    const touchedOrgs = new Set();
    for (const event of meta.extractLeadgenEvents(payload)) {
      const connection = await getConnectionByPage(strapi, event.pageId);
      if (!connection) {
        counts.skipped += 1;
        continue;
      }
      const orgId = connection.organization?.id;
      try {
        const access = (await getOrgAccess(strapi, orgId))?.crm?.access;
        if (access !== 'full') {
          counts.skipped += 1;
          await recordError(strapi, connection.id, `A Meta lead arrived while Grow was ${access || 'not active'}; it was not saved. Use "Import recent leads" once Grow is active again.`);
          continue;
        }
        const result = await ingestLead(strapi, { connection, event, via: 'webhook' });
        if (result.status === 'created') counts.created += 1;
        else if (result.status === 'duplicate') counts.duplicate += 1;
        else if (result.status === 'matched') counts.matched += 1;
        else counts.skipped += 1;
        touchedOrgs.add(orgId);
      } catch (err) {
        counts.failed += 1;
        strapi.log.error(`[meta-lead-ads] lead ${event.leadgenId} (org ${orgId}) failed: ${err?.message || err}`);
        await recordError(strapi, connection.id, err instanceof meta.MetaApiError ? `Meta: ${err.message}` : 'A lead could not be saved. Use "Import recent leads" to retry.');
      }
    }
    for (const orgId of touchedOrgs) await invalidateOrgCache(orgId);
    // 200 even when one lead failed: the error is shown in Settings and backfill recovers it.
    // Meta retries non-2xx responses for hours, which would only repeat the same failure.
    ctx.body = { ok: true, ...counts };
  },

  // ─── OAuth ─────────────────────────────────────────────────────────────────

  async connect(ctx) {
    if (!guard(ctx)) return;
    const cfg = metaConfig();
    if (!requireConfigured(ctx, cfg)) return;
    const state = meta.signState({ orgId: ctx.state.orgId, userId: ctx.state.user.id }, cfg.appSecret);
    return { data: { url: meta.getOAuthUrl(state, cfg.redirectUri, { appId: cfg.appId, graphVersion: cfg.graphVersion }) } };
  },

  async oauthCallback(ctx) {
    if (!isSaas()) return notFound(ctx);
    const cfg = metaConfig();
    if (missingConfig(cfg).length) return redirectToCrm(ctx, cfg, { meta: 'error', reason: 'not_configured' });
    const q = rawQuery(ctx);
    const state = meta.verifyState(q.state, cfg.appSecret);
    if (!state?.orgId || !state?.userId) return redirectToCrm(ctx, cfg, { meta: 'error', reason: 'expired' });
    if (q.error || !q.code) return redirectToCrm(ctx, cfg, { meta: 'error', reason: q.error === 'access_denied' ? 'denied' : 'cancelled' });

    const membership = await strapi.entityService.findMany('api::organization-user.organization-user', {
      filters: { user: state.userId, organization: state.orgId, isActive: true },
      fields: ['id'],
      limit: 1,
    });
    if (!membership.length) return redirectToCrm(ctx, cfg, { meta: 'error', reason: 'not_member' });

    try {
      const token = await meta.exchangeCodeForToken(q.code, {
        appId: cfg.appId,
        appSecret: cfg.appSecret,
        redirectUri: cfg.redirectUri,
        graphVersion: cfg.graphVersion,
        baseUrl: cfg.baseUrl,
      });
      const client = clientFor(token.accessToken, cfg);
      const me = await client.graphRequest('me', { fields: 'id,name' });
      const existing = await getConnection(strapi, state.orgId);
      const data = {
        organization: state.orgId,
        connectedBy: state.userId,
        metaUserId: me?.id ? String(me.id) : null,
        metaUserName: me?.name || null,
        userTokenEnc: encryptToken(token.accessToken, cfg),
        userTokenExpiresAt: token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000).toISOString() : null,
        lastError: null,
        lastErrorAt: null,
      };
      // Reconnecting with a Page already chosen: refresh its token if this login still manages it.
      if (existing?.pageId) {
        const page = (await client.listPages()).find((p) => String(p.id) === String(existing.pageId));
        if (page?.access_token) {
          data.pageTokenEnc = encryptToken(page.access_token, cfg);
          data.status = 'active';
        } else {
          data.status = 'pending_page';
        }
      } else {
        data.status = 'pending_page';
      }
      if (existing) await strapi.entityService.update(CONNECTION_UID, existing.id, { data });
      else await strapi.entityService.create(CONNECTION_UID, { data });
      return redirectToCrm(ctx, cfg, { meta: 'connected' });
    } catch (err) {
      strapi.log.warn(`[meta-lead-ads] OAuth callback failed for org ${state.orgId}: ${err?.message || err}`);
      return redirectToCrm(ctx, cfg, { meta: 'error', reason: 'exchange_failed' });
    }
  },

  // ─── Settings ──────────────────────────────────────────────────────────────

  async status(ctx) {
    if (!guard(ctx, { manage: false })) return;
    ctx.set('Cache-Control', 'no-store');
    return { data: publicConnection(await getConnection(strapi, ctx.state.orgId)) };
  },

  async pages(ctx) {
    if (!guard(ctx)) return;
    const cfg = metaConfig();
    if (!requireConfigured(ctx, cfg)) return;
    const row = await getConnection(strapi, ctx.state.orgId);
    const userToken = decryptToken(row?.userTokenEnc, cfg);
    if (!userToken) return ctx.badRequest('Connect your Facebook account first.', { code: 'META_NOT_CONNECTED' });
    try {
      const pages = await clientFor(userToken, cfg).listPages();
      return { data: pages.map((p) => ({ id: String(p.id), name: p.name })) };
    } catch (err) {
      return graphError(ctx, err);
    }
  },

  async selectPage(ctx) {
    if (!guard(ctx)) return;
    const cfg = metaConfig();
    if (!requireConfigured(ctx, cfg)) return;
    const pageId = String(ctx.request.body?.data?.pageId ?? ctx.request.body?.pageId ?? '').trim();
    if (!/^\d{1,32}$/.test(pageId)) return ctx.badRequest('Choose a Facebook Page.');
    const row = await getConnection(strapi, ctx.state.orgId);
    const userToken = decryptToken(row?.userTokenEnc, cfg);
    if (!userToken) return ctx.badRequest('Connect your Facebook account first.', { code: 'META_NOT_CONNECTED' });

    const taken = await getConnectionByPage(strapi, pageId);
    if (taken && Number(taken.organization?.id) !== Number(ctx.state.orgId)) {
      return ctx.badRequest('This Page is already connected to another organization on Webfudge.', { code: 'META_PAGE_TAKEN' });
    }
    try {
      const page = (await clientFor(userToken, cfg).listPages()).find((p) => String(p.id) === pageId);
      if (!page?.access_token) return ctx.badRequest('You do not manage this Page, or Meta did not grant access to it. Reconnect and tick the Page.');
      await clientFor(page.access_token, cfg).subscribePage(pageId);
      const pageChanged = row.pageId && String(row.pageId) !== pageId;
      if (pageChanged) {
        try {
          const oldToken = decryptToken(row.pageTokenEnc, cfg);
          if (oldToken) await clientFor(oldToken, cfg).unsubscribePage(row.pageId);
        } catch (_) {
          /* best-effort */
        }
      }
      const updated = await strapi.entityService.update(CONNECTION_UID, row.id, {
        data: {
          pageId,
          pageName: page.name || null,
          pageTokenEnc: encryptToken(page.access_token, cfg),
          status: 'active',
          ...(pageChanged || !row.pageId ? { forms: [] } : {}),
          lastError: null,
          lastErrorAt: null,
        },
      });
      return { data: publicConnection(updated) };
    } catch (err) {
      return graphError(ctx, err);
    }
  },

  async forms(ctx) {
    if (!guard(ctx)) return;
    const cfg = metaConfig();
    if (!requireConfigured(ctx, cfg)) return;
    const row = await getConnection(strapi, ctx.state.orgId);
    const pageToken = decryptToken(row?.pageTokenEnc, cfg);
    if (!row?.pageId || !pageToken) return ctx.badRequest('Choose a Facebook Page first.', { code: 'META_NO_PAGE' });
    try {
      const live = await clientFor(pageToken, cfg).listLeadForms(row.pageId);
      const saved = new Map((Array.isArray(row.forms) ? row.forms : []).map((f) => [String(f.id), f]));
      const customFields = await listFields(strapi, ctx.state.orgId, 'lead');
      const data = live.map((f) => {
        const questions = questionsOf(f);
        const s = saved.get(String(f.id));
        return {
          id: String(f.id),
          name: f.name || `Form ${f.id}`,
          status: f.status || null,
          questions,
          enabled: s ? s.enabled !== false : false,
          mapping: { ...meta.suggestMapping(questions), ...(s?.mapping || {}) },
        };
      });
      return {
        data,
        meta: {
          targets: meta.TARGETS,
          customFields: customFields.map((d) => ({ key: d.key, label: d.label })),
        },
      };
    } catch (err) {
      return graphError(ctx, err);
    }
  },

  async saveForms(ctx) {
    if (!guard(ctx)) return;
    const row = await getConnection(strapi, ctx.state.orgId);
    if (!row?.pageId) return ctx.badRequest('Choose a Facebook Page first.', { code: 'META_NO_PAGE' });
    const input = ctx.request.body?.data?.forms ?? ctx.request.body?.forms;
    if (!Array.isArray(input)) return ctx.badRequest('forms must be a list');
    if (input.length > MAX_FORMS) return ctx.badRequest(`At most ${MAX_FORMS} forms`);
    const seen = new Set();
    const forms = [];
    for (const f of input) {
      const id = String(f?.id ?? '').trim();
      if (!/^\d{1,32}$/.test(id) || seen.has(id)) continue;
      seen.add(id);
      forms.push({
        id,
        name: String(f.name || `Form ${id}`).slice(0, 200),
        enabled: f.enabled !== false,
        mapping: meta.sanitizeMapping(f.mapping),
      });
    }
    const updated = await strapi.entityService.update(CONNECTION_UID, row.id, { data: { forms } });
    return { data: publicConnection(updated) };
  },

  async backfill(ctx) {
    if (!guard(ctx)) return;
    const cfg = metaConfig();
    if (!requireConfigured(ctx, cfg)) return;
    const row = await getConnection(strapi, ctx.state.orgId);
    const pageToken = decryptToken(row?.pageTokenEnc, cfg);
    if (!row?.pageId || !pageToken || row.status !== 'active') return ctx.badRequest('Choose a Facebook Page first.', { code: 'META_NO_PAGE' });
    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const days = Math.min(90, Math.max(1, Number(body.days) || 7));
    const since = Math.floor(Date.now() / 1000) - days * 86400;
    const enabled = (Array.isArray(row.forms) ? row.forms : []).filter((f) => f.enabled !== false);
    const forms = body.formId ? enabled.filter((f) => String(f.id) === String(body.formId)) : enabled;
    if (!forms.length) return ctx.badRequest('Turn on at least one lead form first.');

    const counts = { created: 0, duplicate: 0, matched: 0, skipped: 0, failed: 0 };
    let budget = MAX_BACKFILL;
    try {
      const client = clientFor(pageToken, cfg);
      for (const form of forms) {
        if (budget <= 0) break;
        const leads = await client.listFormLeads(form.id, { since, maxItems: budget });
        budget -= leads.length;
        for (const lead of leads) {
          try {
            const r = await ingestLead(strapi, {
              connection: row,
              event: { leadgenId: String(lead.id), formId: String(form.id) },
              lead: { ...lead, form_id: lead.form_id || String(form.id) },
              via: 'backfill',
            });
            counts[r.status === 'skipped_form' ? 'skipped' : r.status] += 1;
          } catch (err) {
            counts.failed += 1;
            strapi.log.warn(`[meta-lead-ads] backfill lead ${lead.id} failed: ${err?.message || err}`);
          }
        }
      }
    } catch (err) {
      return graphError(ctx, err);
    } finally {
      await invalidateOrgCache(ctx.state.orgId);
    }
    return { data: { ...counts, days, capped: budget <= 0 } };
  },

  async disconnect(ctx) {
    if (!guard(ctx)) return;
    const cfg = metaConfig();
    const row = await getConnection(strapi, ctx.state.orgId);
    if (!row) return { data: publicConnection(null) };
    try {
      const pageToken = decryptToken(row.pageTokenEnc, cfg);
      if (row.pageId && pageToken) await clientFor(pageToken, cfg).unsubscribePage(row.pageId);
    } catch (err) {
      strapi.log.warn(`[meta-lead-ads] unsubscribe failed for org ${ctx.state.orgId}: ${err?.message || err}`);
    }
    await strapi.entityService.delete(CONNECTION_UID, row.id);
    return { data: publicConnection(null) };
  },
}));
