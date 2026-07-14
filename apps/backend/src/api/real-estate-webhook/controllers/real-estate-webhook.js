'use strict';

/**
 * Internal webhook API for real-estate lead ingestion + enrichment.
 *
 * Called server-to-server by the Fudge Estate Next.js webhook routes
 * (/api/webhooks/meta and /api/webhooks/landing) — NOT by browsers.
 * There is no user JWT on these calls, so every endpoint is guarded by a
 * shared secret header (X-Webhook-Secret vs RE_WEBHOOK_SECRET env), compared
 * in constant time. Tenancy comes from the project row (its organization),
 * never from the caller.
 *
 * NEVER log tokens or lead PII in this file.
 */

const crypto = require('crypto');

const LEAD_UID = 'api::real-estate-lead.real-estate-lead';
const PROJECT_UID = 'api::real-estate-project.real-estate-project';
const ACTIVITY_UID = 'api::lead-activity.lead-activity';

function secretOk(ctx) {
  const configured = process.env.RE_WEBHOOK_SECRET || '';
  const provided = ctx.request?.headers?.['x-webhook-secret'] || '';
  if (!configured || !provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(configured));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function orgIdOf(entry) {
  const rel = entry?.organization;
  if (rel == null) return null;
  return typeof rel === 'object' ? (rel.id ?? null) : rel;
}

async function logActivity(strapi, { orgId, leadId, type, payload }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: { organization: orgId, lead: leadId, type, payload: payload || {} },
    });
  } catch (_) {
    /* best-effort */
  }
}

/** Whitelisted lead fields a webhook may set. Organization is NEVER caller-controlled. */
const CREATE_FIELDS = [
  'name', 'phone', 'email', 'source',
  'metaLeadId', 'metaCampaignId', 'metaAdsetId', 'metaAdId',
  'budgetRange', 'timeline', 'purpose', 'configInterest',
  'pageVisited', 'pageTimeSeconds', 'optionalAnswers',
  'score', 'tier', 'scoreBreakdown', 'scoredAt',
  'status',
];

const ENRICH_FIELDS = [
  'pageVisited', 'pageTimeSeconds', 'optionalAnswers',
  'score', 'tier', 'scoreBreakdown', 'scoredAt',
];

function pick(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

module.exports = {
  /** GET /re-webhooks/project-by-campaign/:campaignId */
  async projectByCampaign(ctx) {
    if (!secretOk(ctx)) return ctx.unauthorized('Invalid webhook secret');
    const { campaignId } = ctx.params;
    if (!campaignId) return ctx.badRequest('campaignId is required');

    const rows = await strapi.entityService.findMany(PROJECT_UID, {
      filters: { metaCampaignId: String(campaignId) },
      populate: ['organization'],
      limit: 1,
    });
    const project = rows?.[0];
    if (!project) return ctx.notFound('No project mapped to this campaign');

    return {
      data: {
        id: project.id,
        name: project.name,
        minPrice: project.minPrice != null ? Number(project.minPrice) : 0,
        metaFormFieldMapping: project.metaFormFieldMapping || {},
        organizationId: orgIdOf(project),
      },
    };
  },

  /** GET /re-webhooks/leads/:id — lead + project context for re-scoring. */
  async leadById(ctx) {
    if (!secretOk(ctx)) return ctx.unauthorized('Invalid webhook secret');
    const { id } = ctx.params;

    const lead = await strapi.entityService.findOne(LEAD_UID, id, {
      populate: ['organization', 'project'],
    });
    if (!lead) return ctx.notFound();

    return {
      data: {
        id: lead.id,
        budgetRange: lead.budgetRange,
        timeline: lead.timeline,
        purpose: lead.purpose,
        configInterest: lead.configInterest,
        pageVisited: !!lead.pageVisited,
        pageTimeSeconds: lead.pageTimeSeconds,
        optionalAnswers: lead.optionalAnswers,
        score: lead.score,
        tier: lead.tier,
        organizationId: orgIdOf(lead),
        project: lead.project
          ? {
              id: lead.project.id,
              minPrice: lead.project.minPrice != null ? Number(lead.project.minPrice) : 0,
            }
          : null,
      },
    };
  },

  /**
   * POST /re-webhooks/leads
   * Body: { projectId, ...lead fields incl. score/tier/breakdown }
   * Idempotent on metaLeadId. Organization derives from the project.
   */
  async ingestLead(ctx) {
    if (!secretOk(ctx)) return ctx.unauthorized('Invalid webhook secret');
    const body = ctx.request?.body || {};
    const payload = body.data || body;
    if (!payload || typeof payload !== 'object') return ctx.badRequest('Missing payload');
    if (!payload.projectId) return ctx.badRequest('projectId is required');
    if (!payload.name) return ctx.badRequest('name is required');

    const project = await strapi.entityService.findOne(PROJECT_UID, payload.projectId, {
      populate: ['organization'],
    });
    if (!project) return ctx.badRequest('Unknown project');
    const orgId = orgIdOf(project);
    if (!orgId) return ctx.badRequest('Project has no organization');

    // Idempotency: Meta resends webhooks — never duplicate a lead.
    if (payload.metaLeadId) {
      const existing = await strapi.entityService.findMany(LEAD_UID, {
        filters: { metaLeadId: String(payload.metaLeadId) },
        limit: 1,
      });
      if (existing.length) {
        return { data: { id: existing[0].id, tier: existing[0].tier }, meta: { deduplicated: true } };
      }
    }

    const data = {
      ...pick(payload, CREATE_FIELDS),
      organization: orgId,
      project: project.id,
      status: payload.status || 'new',
    };

    const lead = await strapi.entityService.create(LEAD_UID, { data });

    await logActivity(strapi, {
      orgId,
      leadId: lead.id,
      type: 'created',
      payload: {
        source: data.source || 'meta_instant_form',
        via: 'webhook',
        score: data.score,
        tier: data.tier,
      },
    });

    if (data.tier === 'hot') {
      // TODO(stage-5+): wire WhatsApp/SMS hot-lead notification channel.
      await logActivity(strapi, {
        orgId,
        leadId: lead.id,
        type: 'hot_lead_notification',
        payload: { channel: 'pending', score: data.score },
      });
    }

    return { data: { id: lead.id, tier: lead.tier }, meta: { deduplicated: false } };
  },

  /**
   * PUT /re-webhooks/leads/:id/enrich
   * Body: enrichment fields + recomputed score/tier/breakdown.
   * Logs tier upgrades; fires the hot-lead notification stub on upgrade to hot.
   */
  async enrichLead(ctx) {
    if (!secretOk(ctx)) return ctx.unauthorized('Invalid webhook secret');
    const { id } = ctx.params;
    const body = ctx.request?.body || {};
    const payload = body.data || body;
    if (!payload || typeof payload !== 'object') return ctx.badRequest('Missing payload');

    const existing = await strapi.entityService.findOne(LEAD_UID, id, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    const orgId = orgIdOf(existing);

    const data = pick(payload, ENRICH_FIELDS);

    // Enrichment is additive-only: never let a re-score lower the stored score.
    if (typeof data.score === 'number' && typeof existing.score === 'number' && data.score < existing.score) {
      delete data.score;
      delete data.tier;
      delete data.scoreBreakdown;
    }

    const lead = await strapi.entityService.update(LEAD_UID, id, { data });

    await logActivity(strapi, {
      orgId,
      leadId: lead.id,
      type: 'page_enriched',
      payload: {
        pageTimeSeconds: data.pageTimeSeconds,
        score: lead.score,
        tier: lead.tier,
      },
    });

    const upgradedToHot = existing.tier !== 'hot' && lead.tier === 'hot';
    if (upgradedToHot) {
      // TODO(stage-5+): wire WhatsApp/SMS hot-lead notification channel.
      await logActivity(strapi, {
        orgId,
        leadId: lead.id,
        type: 'hot_lead_notification',
        payload: { channel: 'pending', score: lead.score, trigger: 'enrichment_upgrade' },
      });
    }

    return { data: { id: lead.id, score: lead.score, tier: lead.tier, upgradedToHot } };
  },
};
