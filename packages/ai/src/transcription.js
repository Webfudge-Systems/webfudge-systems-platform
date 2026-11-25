'use strict';

/**
 * Voice-note transcription: interface only, no vendor wired yet (decision pending, see
 * docs/AI_PLATFORM.md → "Decisions to confirm").
 *
 * A transcriber is:
 *   {
 *     name: string,
 *     transcribe({ audio: Buffer, mimeType: string, language?: 'en'|'hi'|'mr'|'auto' })
 *       → Promise<{ text: string, language: string, durationSec: number|null, segments?: Array<{ start, end, text }> }>
 *   }
 *
 * To add a vendor: write createXTranscriber() returning that shape, add it to createTranscriberFromEnv,
 * and meter it in the backend with feature "voice.transcribe" (bill by audio minute → credits).
 * Candidates for Indian languages: Sarvam AI (Saarika: Hindi, Marathi, Indian English),
 * Deepgram (Nova, Hindi), OpenAI Whisper / gpt-4o-transcribe, Google Speech-to-Text (Chirp).
 */

const { AiNotConfiguredError } = require('./errors');

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const SUPPORTED_MIME = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/aac'];

function validateAudio({ audio, mimeType }) {
  if (!audio || !audio.length) throw new Error('No audio received.');
  if (audio.length > MAX_AUDIO_BYTES) throw new Error('Voice notes can be up to 25 MB.');
  if (mimeType && !SUPPORTED_MIME.includes(String(mimeType).toLowerCase())) throw new Error(`Unsupported audio type ${mimeType}.`);
}

/** Used when no vendor is configured: always throws AI_NOT_CONFIGURED. */
function createUnconfiguredTranscriber() {
  return {
    name: 'none',
    async transcribe(input) {
      validateAudio(input);
      throw new AiNotConfiguredError('Voice-note transcription is not set up yet.');
    },
  };
}

/** Returns fixed text. For tests and local demos (AI_TRANSCRIPTION_PROVIDER=stub). */
function createStubTranscriber({ text = 'This is a stub transcript.', language = 'en' } = {}) {
  return {
    name: 'stub',
    async transcribe(input) {
      validateAudio(input);
      return { text, language: input.language && input.language !== 'auto' ? input.language : language, durationSec: null, segments: [] };
    },
  };
}

/** AI_TRANSCRIPTION_PROVIDER = none (default) | stub. */
function createTranscriberFromEnv(env = process.env) {
  const name = String(env.AI_TRANSCRIPTION_PROVIDER || 'none').toLowerCase();
  if (name === 'stub') return createStubTranscriber();
  return createUnconfiguredTranscriber();
}

module.exports = { createTranscriberFromEnv, createUnconfiguredTranscriber, createStubTranscriber, validateAudio, MAX_AUDIO_BYTES, SUPPORTED_MIME };
