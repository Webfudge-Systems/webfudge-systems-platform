'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

const UID = 'api::crm-activity.crm-activity';
const CONTACT_UID = 'api::contact.contact';
const LEAD_UID = 'api::lead-company.lead-company';

function orgIdFromRelation(rel) {
  if (rel == null) return null;
  if (typeof rel === 'object') return rel.id ?? null;
  return rel;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  /**
   * GET /crm-activities/timeline?contactId= | ?leadCompanyId=
   * Exactly one scope param. Includes contact changes rolled up to a lead via leadCompany.
   */
  async timeline(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const q = ctx.query || {};
    const contactIdRaw = q.contactId ?? q['contactId'];
    const leadIdRaw = q.leadCompanyId ?? q['leadCompanyId'];
    const hasContact =
      contactIdRaw != null && String(contactIdRaw).trim() !== '' && contactIdRaw !== 'undefined';
    const hasLead =
      leadIdRaw != null && String(leadIdRaw).trim() !== '' && leadIdRaw !== 'undefined';

    if (hasContact === hasLead) {
      return ctx.badRequest('Provide exactly one of contactId or leadCompanyId');
    }

    const limit = Math.min(parseInt(q.limit || q['limit'] || '50', 10), 100);
    const type = String(q.type || q['type'] || '').trim().toLowerCase();

    let filters;

    if (hasContact) {
      const cid = parseInt(String(contactIdRaw), 10);
      if (Number.isNaN(cid)) return ctx.badRequest('Invalid contactId');

      const contact = await strapi.entityService.findOne(CONTACT_UID, cid, {
        populate: ['organization'],
      });
      if (!contact) return ctx.notFound();
      if (orgIdFromRelation(contact.organization) !== ctx.state.orgId) {
        return ctx.forbidden('Access denied');
      }

      filters = {
        organization: ctx.state.orgId,
        subjectType: 'contact',
        subjectId: cid,
      };
    } else {
      const lid = parseInt(String(leadIdRaw), 10);
      if (Number.isNaN(lid)) return ctx.badRequest('Invalid leadCompanyId');

      const lead = await strapi.entityService.findOne(LEAD_UID, lid, {
        populate: ['organization'],
      });
      if (!lead) return ctx.notFound();
      if (orgIdFromRelation(lead.organization) !== ctx.state.orgId) {
        return ctx.forbidden('Access denied');
      }

      filters = {
        organization: ctx.state.orgId,
        leadCompany: lid,
      };
    }

    let total = 0;
    if (type === 'comment') {
      filters = { ...filters, action: 'comment' };
    }
    try {
      total = await strapi.db.query(UID).count({ where: filters });
    } catch (_) {
      total = 0;
    }

    const results = await strapi.entityService.findMany(UID, {
      filters,
      sort: { createdAt: 'DESC' },
      limit,
      populate: ['actor'],
    });

    return { data: results, meta: { total } };
  },

  /**
   * POST /crm-activities/comments
   * body: { leadCompanyId: number|string, comment: string }
   */
  async addComment(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const leadCompanyIdRaw = payload?.leadCompanyId;
    const commentRaw = payload?.comment;

    const leadCompanyId = parseInt(String(leadCompanyIdRaw || ''), 10);
    if (!leadCompanyId || Number.isNaN(leadCompanyId)) {
      return ctx.badRequest('Invalid leadCompanyId');
    }

    const comment = String(commentRaw || '').trim();
    if (!comment) return ctx.badRequest('Comment is required');
    if (comment.length > 5000) return ctx.badRequest('Comment is too long');

    const lead = await strapi.entityService.findOne(LEAD_UID, leadCompanyId, {
      populate: ['organization'],
    });
    if (!lead) return ctx.notFound('Lead company not found');
    if (orgIdFromRelation(lead.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const actorName =
      ctx.state.user?.username ||
      ctx.state.user?.email ||
      (ctx.state.user?.id != null ? `User ${ctx.state.user.id}` : 'User');
    const leadName = (lead.companyName || lead.name || 'Lead company').trim() || 'Lead company';

    const entry = await strapi.entityService.create(UID, {
      data: {
        organization: ctx.state.orgId,
        actor: ctx.state.user?.id ?? null,
        action: 'comment',
        subjectType: 'lead_company',
        subjectId: leadCompanyId,
        leadCompany: leadCompanyId,
        summary: `${actorName} commented on "${leadName}"`,
        meta: {
          comment,
        },
      },
      populate: ['actor'],
    });

    return { data: entry };
  },

  /**
   * GET /crm-activities/comment-counts?leadCompanyIds=1,2,3
   * Returns: { data: { [leadCompanyId]: number } }
   */
  async commentCounts(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const q = ctx.query || {};
    const raw = q.leadCompanyIds ?? q['leadCompanyIds'] ?? q.ids ?? q['ids'];
    const list = Array.isArray(raw) ? raw : String(raw || '').split(',');
    const ids = [...new Set(list.map((v) => parseInt(String(v).trim(), 10)).filter((n) => n && !Number.isNaN(n)))].slice(
      0,
      200
    );

    if (!ids.length) return { data: {} };

    // For small lists (current page), parallel counts are fine and portable across DBs.
    const pairs = await Promise.all(
      ids.map(async (leadCompanyId) => {
        let count = 0;
        try {
          count = await strapi.db.query(UID).count({
            where: { organization: ctx.state.orgId, leadCompany: leadCompanyId, action: 'comment' },
          });
        } catch (_) {
          count = 0;
        }
        return [String(leadCompanyId), count];
      })
    );

    return { data: Object.fromEntries(pairs) };
  },
}));
