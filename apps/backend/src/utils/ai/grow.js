'use strict';

/**
 * Fudge Grow AI features built on the P5 foundation.
 *
 *   scoreLead      — first consumer (acceptance for P5; the full UI is ticket G11)
 *   draftFollowup  — drafts an email and queues it for approval (outbound actions never send directly)
 */

const { renderTemplate, generateObject, normalizeLanguage, AiError } = require('@webfudge/ai');
const ai = require('./index');
const { getActionRunner, actorFromCtx, assertAllowed, loadLead } = require('./actions');
const { getMemory, indexQuietly } = require('./memory');

const LEAD_UID = 'api::lead-company.lead-company';

function notFound() {
  return new AiError('Lead not found.', { code: 'AI_SUBJECT_NOT_FOUND', status: 404 });
}

async function leadWithContacts(strapi, orgId, leadId) {
  const lead = await loadLead(strapi, orgId, leadId);
  if (!lead) return null;
  const full = await strapi.entityService.findOne(LEAD_UID, lead.id, {
    populate: { contacts: { fields: ['firstName', 'lastName', 'email', 'phone', 'jobTitle'] } },
  });
  return full;
}

function leadMemoryText(lead) {
  return [lead.companyName, lead.industry, lead.city, lead.description, lead.notes].filter(Boolean).join('. ');
}

/**
 * Scores one lead with the cheap tier, stores score + reasons on the lead through the action
 * framework (permission-checked, audited, undoable) and returns the result with credit status.
 */
async function scoreLead(strapi, ctx, leadId, { language } = {}) {
  const orgId = ctx.state.orgId;
  const actor = actorFromCtx(ctx);
  const lead = await leadWithContacts(strapi, orgId, leadId);
  if (!lead) throw notFound();
  // Check permission before spending credits.
  await assertAllowed(strapi, 'grow.lead.set_ai_score', actor, { leadId: lead.id });

  const lang = normalizeLanguage(language);
  let memory = [];
  try {
    const query = [lead.companyName, lead.industry, lead.notes].filter(Boolean).join(' ');
    memory = (await getMemory(strapi).search(orgId, query, { k: 4 }))
      .filter((m) => !(m.sourceType === 'lead_company' && String(m.sourceId) === String(lead.id)))
      .slice(0, 3);
  } catch (err) {
    strapi.log.warn(`[ai] memory search failed: ${err.message}`);
  }

  const t = renderTemplate('grow.lead_score', { lead, memory }, { language: lang });
  const client = ai.clientFor(strapi, ctx);
  const out = await generateObject(client, { ...t, feature: 'grow.lead_score', metadata: { subjectType: 'lead_company', subjectId: lead.id } });

  const record = await getActionRunner(strapi).propose({
    key: 'grow.lead.set_ai_score',
    actor,
    orgId,
    input: { leadId: lead.id, score: out.object.score, label: out.object.label, reasons: out.object.reasons, nextStep: out.object.nextStep, model: out.model, language: lang },
    feature: 'grow.lead_score',
    subject: { type: 'lead_company', id: lead.id },
    aiMeta: { model: out.model, attempts: out.attempts, credits: out.credits, memoryHits: memory.length },
  });

  await indexQuietly(strapi, orgId, { sourceType: 'lead_company', sourceId: lead.id, text: leadMemoryText(lead), metadata: { title: lead.companyName || null } });

  return {
    leadId: lead.id,
    score: out.object.score,
    label: out.object.label,
    reasons: out.object.reasons,
    nextStep: out.object.nextStep,
    language: lang,
    scoredAt: record.result?.scoredAt || new Date().toISOString(),
    model: out.model,
    creditsUsed: out.credits,
    actionId: record.id,
    undoable: record.undoable,
    credits: await ai.creditStatus(strapi, orgId),
  };
}

/** Drafts a follow-up email with the strong tier and queues it for approval. */
async function draftFollowup(strapi, ctx, leadId, { language, goal, to } = {}) {
  const orgId = ctx.state.orgId;
  const actor = actorFromCtx(ctx);
  const lead = await leadWithContacts(strapi, orgId, leadId);
  if (!lead) throw notFound();
  const recipient = to || lead.email || (lead.contacts || []).find((c) => c.email)?.email;
  if (!recipient) throw new AiError('This lead has no email address yet.', { code: 'AI_NO_RECIPIENT', status: 400 });
  await assertAllowed(strapi, 'grow.lead.send_email', actor, { leadId: lead.id });

  const t = renderTemplate('grow.followup_email', { lead, goal, senderName: ctx.state.user?.username }, { language });
  const out = await generateObject(ai.clientFor(strapi, ctx), { ...t, feature: 'grow.followup_email', metadata: { subjectType: 'lead_company', subjectId: lead.id } });

  return getActionRunner(strapi).propose({
    key: 'grow.lead.send_email',
    actor,
    orgId,
    input: { leadId: lead.id, to: recipient, subject: out.object.subject, body: out.object.body, language: t.language },
    feature: 'grow.followup_email',
    subject: { type: 'lead_company', id: lead.id },
    aiMeta: { model: out.model, credits: out.credits },
  });
}

module.exports = { scoreLead, draftFollowup };
