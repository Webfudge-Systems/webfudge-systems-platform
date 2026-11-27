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
  if (props.calls) return mockAskPlan(req);
  if (props.answer && props.taskIds) return mockAskAnswer(req);
  return 'ok';
}

// W21 Ask Work: keyword plan + answer listing the rows (good enough to exercise the flow locally).
function lastUserText(req) {
  const m = (req.messages || []).filter((x) => x.role === 'user').pop();
  return typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content || '');
}

function mockAskPlan(req) {
  const text = lastUserText(req);
  const q = (text.match(/Question: (.*)/) || [])[1] || '';
  const today = (text.match(/Today: (\d{4}-\d{2}-\d{2})/) || [])[1] || new Date().toISOString().slice(0, 10);
  const args = {};
  if (/overdue|late/i.test(q)) args.status = 'overdue';
  else if (/finish|complet|done/i.test(q)) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    Object.assign(args, { status: 'completed', completedFrom: d.toISOString().slice(0, 10), completedTo: today });
  } else args.status = 'open';
  const on = q.match(/\b(?:on|for|in) ([A-Z][\w&.-]*)/);
  if (on) args.client = on[1];
  const who = q.match(/\b(?:did|has|is) ([A-Z]\w*)/);
  if (who) args.assignee = who[1];
  else if (/\b(my|me|i)\b/i.test(q)) args.assignee = 'me';
  return JSON.stringify({ calls: [{ tool: 'find_tasks', args }] });
}

function mockAskAnswer(req) {
  const text = lastUserText(req);
  let results = [];
  try {
    results = JSON.parse(text.split('Tool results:\n')[1].split('\n\nOutput language:')[0]);
  } catch {
    results = [];
  }
  const rows = results.flatMap((r) => r.rows || []);
  if (!rows.length) return JSON.stringify({ answer: 'I found nothing matching that in the work you can see.', taskIds: [] });
  const list = rows.slice(0, 5).map((r) => `${r.name}${r.due ? ` (due ${r.due})` : ''}`).join('; ');
  return JSON.stringify({ answer: `I found ${rows.length} task${rows.length === 1 ? '' : 's'}: ${list}.`, taskIds: rows.slice(0, 25).map((r) => r.id) });
}

module.exports = { mockRespond };
