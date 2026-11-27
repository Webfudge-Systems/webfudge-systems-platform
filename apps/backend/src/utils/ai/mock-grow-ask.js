'use strict';

/** G20 Ask Grow answers for AI_PROVIDER=mock: keyword-parses the question into a lead filter. */
function mockGrowAsk(req) {
  const props = req.jsonSchema?.properties || {};
  if (!(props.filter && props.explanation)) return null;
  const text = (req.messages || []).map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''))).join('\n');
  const question = (text.match(/Question: """([\s\S]*?)"""/) || [])[1] || '';
  const { parseQuestion } = require('./ask-grow');
  return JSON.stringify({ filter: parseQuestion(question), explanation: 'Mock filter (AI_PROVIDER=mock).' });
}

module.exports = { mockGrowAsk };
