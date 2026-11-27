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
  const w19 = require('./mock-work-risk').mockWorkRisk(req); // W19 risk radar + scope watcher
  if (w19) return w19;
  const g20 = require('./mock-grow-ask').mockGrowAsk(req); // G20 Ask Grow
  if (g20) return g20;
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
  if (props.internal && props.client) return mockWeeklyStatus(req.messages); // W17
  if (props.phases && props.projectName) return JSON.stringify(mockProjectPlan(user)); // W16
  if (props.calls) return mockAskPlan(req); // W21
  if (props.answer && props.taskIds) return mockAskAnswer(req); // W21
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
  if (props.internal && props.client) return mockWeeklyStatus(req.messages);
  return 'ok';
}

/** W17 weekly status: lists the task names it was given, so local runs show real data. */
function mockWeeklyStatus(messages = []) {
  let activity = {};
  try {
    const text = String(messages[messages.length - 1]?.content || '');
    const marker = 'Task activity:\n';
    const from = text.indexOf(marker);
    const to = text.indexOf('\n\nOutput language');
    activity = JSON.parse(text.slice(from + marker.length, to > from ? to : undefined));
  } catch {
    /* not our prompt shape */
  }
  const names = (key) => (Array.isArray(activity[key]) ? activity[key].map((t) => t.name).filter(Boolean).slice(0, 8) : []);
  const done = names('done');
  const inProgress = names('inProgress');
  const blocked = names('blocked');
  const nextWeek = names('nextWeek');
  return JSON.stringify({
    internal: {
      headline: `${done.length} done, ${inProgress.length} in progress, ${blocked.length} blocked this week.`,
      health: blocked.length ? 'at_risk' : 'on_track',
      done,
      inProgress,
      blocked,
      nextWeek,
      risks: blocked.length ? [`${blocked.length} task(s) blocked or overdue.`] : [],
    },
    client: {
      subject: 'Your weekly project update',
      summary: done.length ? `Good progress this week: we completed ${done.length} item(s).` : 'Work continued this week.',
      done,
      inProgress,
      nextWeek,
      needsFromClient: [],
    },
  });
  if (props.phases && props.projectName) return JSON.stringify(mockProjectPlan(user));
  return 'ok';
}

/** W16 planner: a small but complete plan (phases, roles, estimates, dependencies). */
function mockProjectPlan(user) {
  const isVideo = /video|shoot|reel|film/i.test(user);
  const t = (ref, name, role, type, estimateHours, startDay, durationDays, dependsOn = [], description = '') => ({ ref, name, description, role, type, estimateHours, startDay, durationDays, dependsOn });
  const phases = isVideo
    ? [
        { name: 'Pre-production', tasks: [t('T1', 'Kickoff call with client', 'Project manager', 'task', 2, 0, 1), t('T2', 'Script', 'Copywriter', 'deliverable', 12, 1, 4, ['T1']), t('T3', 'Script approval', 'Project manager', 'milestone', 0, 5, 0, ['T2'])] },
        { name: 'Production', tasks: [t('T4', 'Shoot day', 'Videographer', 'task', 10, 6, 1, ['T3'])] },
        { name: 'Post-production', tasks: [t('T5', 'Rough cut', 'Video editor', 'deliverable', 16, 7, 4, ['T4']), t('T6', 'Final delivery', 'Video editor', 'milestone', 0, 11, 0, ['T5'])] },
      ]
    : [
        { name: 'Discovery', tasks: [t('T1', 'Kickoff call with client', 'Project manager', 'task', 2, 0, 1, [], 'Agree goals, timeline and points of contact.'), t('T2', 'Sitemap and page list', 'Designer', 'deliverable', 6, 1, 2, ['T1']), t('T3', 'Discovery sign-off', 'Project manager', 'milestone', 0, 3, 0, ['T2'])] },
        { name: 'Design', tasks: [t('T4', 'Wireframes', 'Designer', 'deliverable', 16, 3, 4, ['T3']), t('T5', 'Website copy', 'Copywriter', 'deliverable', 12, 3, 5, ['T3']), t('T6', 'Design approval', 'Project manager', 'milestone', 0, 8, 0, ['T4', 'T5'])] },
        { name: 'Build & launch', tasks: [t('T7', 'Build pages', 'Developer', 'task', 40, 8, 8, ['T6']), t('T8', 'QA and client review', 'Project manager', 'task', 6, 16, 3, ['T7']), t('T9', 'Go live', 'Developer', 'milestone', 0, 19, 0, ['T8'])] },
      ];
  return {
    projectName: isVideo ? 'Brand video' : 'Website build',
    summary: 'Plan drafted from the brief. Review the phases, owners and estimates before creating the project.',
    phases,
    assumptions: ['Client shares brand assets in the first week.'],
    risks: ['Approval delays push the launch date.'],
  };
}

module.exports = { mockRespond };
