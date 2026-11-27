'use strict';

/**
 * Answers for AI_PROVIDER=mock (local end-to-end runs without an API key). Picks a plausible
 * answer from the requested JSON schema so the built-in templates work. Never used in production
 * unless AI_PROVIDER=mock is set.
 */

/** The user messages as plain text (content may be a string or text blocks). */
function plainText(req) {
  return (req.messages || [])
    .map((m) => (typeof m.content === 'string' ? m.content : (m.content || []).map((b) => b.text || '').join('\n')))
    .join('\n');
}

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
  if (props.suggestions) {
    // W20 triage: one plausible suggestion per task, no assignee (the user picks).
    const ids = [...new Set([...plainText(req).matchAll(/"taskId":\s*(\d+)/g)].map((m) => Number(m[1])))];
    const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    return JSON.stringify({ suggestions: ids.map((taskId) => ({ taskId, priority: 'medium', assigneeId: null, taskListId: null, dueDate: due, reason: 'Mock suggestion (AI_PROVIDER=mock).' })) });
  }
  if (props.items) {
    // W20 meeting -> tasks: every note line that reads like a commitment becomes an item.
    const notes = (plainText(req).split('"""')[1] || '').split('\n').map((l) => l.replace(/^[-*\s]+/, '').trim());
    const items = notes
      .filter((l) => /\b(to|will|should|needs? to|action)\b/i.test(l))
      .slice(0, 10)
      .map((l) => ({ title: l.slice(0, 120), description: '', owner: (l.match(/^([A-Z][a-z]+)/) || [])[1] || null, dueDate: null, priority: 'medium' }));
    return JSON.stringify({ items });
  }
  return 'ok';
}

module.exports = { mockRespond };
