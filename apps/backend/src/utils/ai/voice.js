'use strict';

/**
 * Voice-note transcription (OpenAI Whisper), metered in AI credits by audio minute.
 *
 *   const { text, language } = await transcribeVoiceNote(strapi, ctx, { audio, mimeType, language });
 *
 * Cost = minutes × AI_TRANSCRIPTION_USD_PER_MIN (default $0.006, Whisper's list price), turned into
 * credits with the same rule as model calls (AI_CREDIT_USD, minimum 1 per note).
 */

const { createTranscriberFromEnv, creditsFor } = require('@webfudge/ai');
const { createMeter } = require('./index');

const FEATURE = 'voice.transcribe';

let transcriber = null;
function getTranscriber() {
  if (!transcriber) transcriber = createTranscriberFromEnv(process.env);
  return transcriber;
}

/** For tests: swap the transcriber. */
function setTranscriber(t) {
  transcriber = t;
}

async function transcribeVoiceNote(strapi, ctx, { audio, mimeType, language }) {
  const t = getTranscriber();
  const meter = createMeter(strapi, { orgId: ctx.state.orgId, userId: ctx.state.user?.id ?? null });
  await meter.check({ feature: FEATURE });

  const started = Date.now();
  let out;
  try {
    out = await t.transcribe({ audio, mimeType, language });
  } catch (err) {
    await meter.record({ feature: FEATURE, task: 'transcribe', provider: t.name, model: t.model || t.name, usage: {}, costUsd: 0, credits: 0, latencyMs: Date.now() - started, status: 'error', error: err.code || err.message });
    throw err;
  }

  const minutes = Math.max(out.durationSec || 0, 1) / 60;
  const perMin = Number(process.env.AI_TRANSCRIPTION_USD_PER_MIN) > 0 ? Number(process.env.AI_TRANSCRIPTION_USD_PER_MIN) : 0.006;
  const costUsd = Math.round(minutes * perMin * 1e6) / 1e6;
  const credits = creditsFor(costUsd, process.env);
  await meter.record({
    feature: FEATURE,
    task: 'transcribe',
    provider: t.name,
    model: out.model || t.model || t.name,
    usage: {},
    costUsd,
    credits,
    latencyMs: Date.now() - started,
    status: 'ok',
    metadata: { durationSec: out.durationSec, language: out.language },
  });
  return { ...out, creditsUsed: credits };
}

module.exports = { transcribeVoiceNote, getTranscriber, setTranscriber, FEATURE };
