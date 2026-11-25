'use strict';

/**
 * Answers for AI_PROVIDER=mock (local end-to-end runs without an API key). Picks a plausible
 * answer from the requested JSON schema so the built-in templates work. Never used in production
 * unless AI_PROVIDER=mock is set.
 */

function mockRespond(req) {
  const props = req.jsonSchema?.properties || {};
  const user = JSON.stringify(req.messages || []);
  if (props.score && props.reasons) {
    const hasEmail = /\\"email\\"/.test(user);
    const hasPhone = /\\"phone\\"/.test(user);
    const score = 35 + (hasEmail ? 25 : 0) + (hasPhone ? 15 : 0);
    return JSON.stringify({
      score,
      label: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold',
      reasons: [
        hasEmail ? 'Has a work email, so outreach is possible today.' : 'No email on file yet.',
        hasPhone ? 'Phone number available for a quick call.' : 'No phone number on file.',
      ],
      nextStep: hasPhone ? 'Call this week to qualify budget and timeline.' : 'Find a direct contact before reaching out.',
    });
  }
  if (props.subject && props.body) {
    return JSON.stringify({ subject: 'Quick follow-up', body: 'Hi,\n\nThanks for your interest. Would a 15-minute call this week work?\n\nRegards' });
  }
  if (props.status && props.nextSteps) {
    return JSON.stringify({ status: 'In progress.', blockers: [], nextSteps: ['Review the latest comments.'] });
  }
  return 'ok';
}

module.exports = { mockRespond };
