'use strict';

/**
 * AI_PROVIDER=mock answers for the W19 templates (work.risk_explain, work.scope_check,
 * work.change_order), so the feature can be tried end to end without an API key.
 *
 * Scope check heuristic: a request is in scope when most of its meaningful words appear in the SOW
 * text, out of scope otherwise. A PDF SOW cannot be read by the mock, so those come back "unclear".
 */

const STOP = new Set(
  'about above after again also and any are been before being below between both but can could does doing down each few for from further had has have having here how into its itself just more most need needs other our out over own please same should some such than that the their them then there these they this those through too under until very was were what when where which while who why will with would you your add new make want like client request comment task'.split(' ')
);

function words(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w))
    .map((w) => w.replace(/(ies|es|s)$/, ''));
}

function lastUserText(req) {
  const msgs = (req.messages || []).filter((m) => m.role === 'user');
  const first = msgs[0];
  if (!first) return '';
  if (typeof first.content === 'string') return first.content;
  return (first.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
}

function scopeCheck(req) {
  const text = lastUserText(req);
  const sowMatch = text.match(/"""\n([\s\S]*?)\n"""/);
  const reqMatch = text.match(/Client requests \(JSON\):\n([\s\S]*?)\n\nOutput language/);
  let requests = [];
  try {
    requests = JSON.parse(reqMatch ? reqMatch[1] : '[]');
  } catch {
    requests = [];
  }
  const sow = new Set(words(sowMatch ? sowMatch[1] : ''));
  return {
    results: requests.map((r) => {
      if (!sow.size) return { requestId: r.requestId, verdict: 'unclear', confidence: 'low', reason: 'The mock provider cannot read this SOW document.', sowReference: '', estimateHours: 0 };
      const ws = [...new Set(words(`${r.title} ${r.details}`))];
      const hit = ws.filter((w) => sow.has(w));
      const coverage = ws.length ? hit.length / ws.length : 1;
      const missing = ws.filter((w) => !sow.has(w)).slice(0, 4);
      return coverage >= 0.5
        ? { requestId: r.requestId, verdict: 'in_scope', confidence: coverage > 0.75 ? 'high' : 'medium', reason: `The SOW covers ${hit.slice(0, 4).join(', ')}.`, sowReference: hit.slice(0, 3).join(', '), estimateHours: 0 }
        : { requestId: r.requestId, verdict: 'out_of_scope', confidence: coverage < 0.2 ? 'high' : 'medium', reason: `The SOW does not mention ${missing.join(', ') || 'this work'}.`, sowReference: '', estimateHours: Math.max(2, ws.length * 2) };
    }),
  };
}

function mockWorkRisk(req) {
  const props = req.jsonSchema?.properties || {};
  if (props.results && req.jsonSchema?.properties?.results?.items?.properties?.verdict) return JSON.stringify(scopeCheck(req));
  if (props.title && props.estimateHours && props.subject) {
    const text = lastUserText(req);
    const title = (text.match(/"title": "([^"]+)"/) || [])[1] || 'Additional work';
    const hours = Number((text.match(/Estimated effort: ([\d.]+)/) || [])[1]) || 4;
    return JSON.stringify({
      title: `Change order: ${title}`.slice(0, 140),
      subject: `Change order for "${title}"`.slice(0, 160),
      estimateHours: hours,
      body: `Hi,\n\nThank you for the request "${title}". It is outside the scope we agreed in the statement of work, so we have prepared a change order.\n\nAdditional work: ${title}\nEstimated effort: ${hours} hours\n\nPlease reply to approve this change order and we will schedule the work.\n\nRegards`,
    });
  }
  if (props.headline && props.actions) {
    return JSON.stringify({
      headline: 'Some deadlines are at risk',
      explanation: 'Overdue tasks are holding up the tasks that depend on them, and part of the work sits with people who are over capacity.',
      actions: [{ title: 'Unblock the overdue chain first', why: 'Dependent tasks cannot start until it is done.' }],
    });
  }
  return null;
}

module.exports = { mockWorkRisk, scopeCheck };
