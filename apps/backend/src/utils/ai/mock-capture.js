'use strict';

/** AI_PROVIDER=mock answer for grow.auto_capture (G10): keyword extraction, English + Hinglish. */

const UNITS = { lakh: 1e5, lakhs: 1e5, lac: 1e5, crore: 1e7, cr: 1e7, k: 1e3 };

function textOf(req) {
  return (req.messages || []).map((m) => (typeof m.content === 'string' ? m.content : (m.content || []).map((b) => b.text || '').join('\n'))).join('\n');
}

function mockCapture(req) {
  const p = req.jsonSchema?.properties || {};
  if (!(p.budget && p.timeline && p.nextStep)) return null;
  const all = textOf(req);
  const convo = all.split('"""')[1] || '';
  const stages = ((all.match(/Allowed stages: (.*)/) || [])[1] || '').split(',').map((s) => s.trim()).filter(Boolean);
  const sentences = convo.split(/(?<=[.!?])\s+|\n/).map((s) => s.replace(/^\[[^\]]*\]\s*\([^)]*\)\s*/, '').trim()).filter(Boolean);
  const find = (re) => sentences.filter((s) => re.test(s)).pop() || null;

  let budget = { amount: null, currency: null, evidence: null };
  const bm = [...convo.matchAll(/(\d+(?:\.\d+)?)\s*(lakhs?|lac|crore|cr|k)\b/gi)].pop();
  if (bm) budget = { amount: Math.round(Number(bm[1]) * UNITS[bm[2].toLowerCase()]), currency: 'INR', evidence: bm[0] };

  const tl = find(/\b(tak|by (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|next month|agle mahine|go live)\b/i);
  const tm = tl && (tl.match(/(\w+ tak|by \w+|next month|agle mahine)/i) || [])[0];
  const req2 = find(/\b(need|needs|want a|chahiye)\b/i);
  const ns = find(/\b(send|call|share|bhej|follow up)\b/i);
  const title = ns && (ns.match(/((?:send|call|share|follow up)[^,.;]*)/i) || [])[1];
  const stage = /\bproposal\b/i.test(convo) ? stages.find((s) => s.toLowerCase() === 'proposal') || stages.find((s) => s === 'QUALIFIED') || null : null;

  return JSON.stringify({
    budget,
    timeline: { text: tm || null, date: null, evidence: tl },
    requirement: { text: req2, evidence: req2 },
    nextStep: { title: title ? title.trim().replace(/^\w/, (c) => c.toUpperCase()) : null, dueDate: null, evidence: ns },
    stage: { value: stage, evidence: stage ? 'proposal' : null },
  });
}

module.exports = { mockCapture };
