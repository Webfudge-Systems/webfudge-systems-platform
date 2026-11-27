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
