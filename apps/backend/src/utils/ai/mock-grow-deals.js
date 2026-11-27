'use strict';

/**
 * AI_PROVIDER=mock answers for the G19 templates (grow.deal_signals, grow.forecast_explain), so deal
 * health and the forecast can be tried end to end without an API key. Competitor = a capitalised word
 * after "competitor", "also looking at", "comparing with" or "vs" in the notes.
 */

const COMPETITOR = /(?:competitor|also (?:looking at|talking to|evaluating)|comparing (?:with|to)|\bvs\.?)\s*:?\s*([A-Z][\w.-]{1,40})/;
const NEGATIVE = /\b(expensive|too costly|unhappy|not interested|delay|postpone|concern|frustrat|budget cut|on hold)/i;
const POSITIVE = /\b(great|happy|excited|approved|love|keen|ready to sign)/i;

function userText(req) {
  return (req.messages || [])
    .filter((m) => m.role === 'user')
    .map((m) => (typeof m.content === 'string' ? m.content : (m.content || []).map((b) => b.text || '').join('\n')))
    .join('\n');
}

function afterLabel(text, label) {
  const i = text.indexOf(label);
  if (i < 0) return null;
  const rest = text.slice(i + label.length).trimStart();
  const close = rest.lastIndexOf(rest[0] === '[' ? ']' : '}'); // text may follow the JSON (language note)
  try {
    return JSON.parse(rest.slice(0, close + 1));
  } catch (_) {
    return null;
  }
}

function mockGrowDeals(req) {
  const props = req.jsonSchema?.properties || {};
  const text = userText(req);
  if (props.deals?.items?.properties?.whatToSay) {
    const deals = afterLabel(text, 'Deals:\n') || [];
    return JSON.stringify({
      deals: deals.map((d) => {
        const notes = (d.notes || []).join(' \n ');
        const competitor = (notes.match(COMPETITOR) || [])[1] || '';
        const neg = notes.match(NEGATIVE);
        const sentiment = neg ? 'negative' : POSITIVE.test(notes) ? 'positive' : 'neutral';
        const top = (d.reasons || [])[0] || '';
        const whatToSay = competitor
          ? `Ask what they like about ${competitor} and show where ${d.name || 'your offer'} is a better fit.`
          : top
            ? `Mention that you noticed "${top.toLowerCase()}" and ask what would help them decide this week.`
            : `Confirm the decision date and any open questions on ${d.name || 'the deal'}.`;
        return { dealId: d.dealId, competitor, sentiment, evidence: neg ? neg[0] : competitor ? `mentions ${competitor}` : '', whatToSay };
      }),
    });
  }
  if (props.headline && props.focus) {
    const fc = afterLabel(text, 'Forecast:\n') || {};
    const top = (fc.topDeals || []).slice(0, 3).map((d) => `${d.name || `Deal #${d.id}`} (${d.stage})`);
    return JSON.stringify({
      headline: `Expected about ${fc.expected ?? 0} this month (range ${fc.low ?? 0}–${fc.high ?? 0}).`,
      explanation: `The number adds revenue already won (${fc.wonSoFar ?? 0}) to ${fc.dealCount ?? 0} open deals weighted by how often deals at each stage were won before. The range is where the result should land 8 times in 10.`,
      focus: top,
    });
  }
  return null;
}

module.exports = { mockGrowDeals };
