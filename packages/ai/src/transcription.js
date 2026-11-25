'use strict';

/**
 * Voice-note transcription. Vendor: OpenAI Whisper (AI_TRANSCRIPTION_PROVIDER=whisper, OPENAI_API_KEY).
 *
 * A transcriber is:
 *   {
 *     name: string,
 *     transcribe({ audio: Buffer, mimeType: string, language?: 'en'|'hi'|'mr'|'auto' })
 *       → Promise<{ text: string, language: string, durationSec: number|null, segments?: Array<{ start, end, text }> }>
 *   }
 *
 * The backend meters it as feature "voice.transcribe", billed by audio minute (utils/ai/voice.js).
 * Another vendor = another createXTranscriber() with this shape, added to createTranscriberFromEnv.
 */

const { AiNotConfiguredError, AiProviderError, AiTimeoutError } = require('./errors');

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

const WHISPER_LANGUAGE_CODES = { english: 'en', hindi: 'hi', marathi: 'mr' };
const EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'aac' };

/**
 * OpenAI Whisper (POST /v1/audio/transcriptions). Chosen vendor for voice notes.
 * Pass language 'en' | 'hi' | 'mr' when known (better accuracy); 'auto' or empty lets Whisper detect it.
 * Returns durationSec so the backend can meter by audio minute.
 */
function createWhisperTranscriber({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.AI_TRANSCRIPTION_MODEL || 'whisper-1',
  timeoutMs = Number(process.env.AI_TRANSCRIPTION_TIMEOUT_MS) || 120000,
  fetchImpl = globalThis.fetch,
} = {}) {
  return {
    name: 'whisper',
    model,
    async transcribe(input) {
      validateAudio(input);
      if (!apiKey) throw new AiNotConfiguredError('OPENAI_API_KEY is not set on the API service.');
      const mimeType = String(input.mimeType || 'audio/webm').toLowerCase();
      const form = new FormData();
      form.append('file', new Blob([input.audio], { type: mimeType }), `voice-note.${EXT[mimeType] || 'webm'}`);
      form.append('model', model);
      form.append('response_format', 'verbose_json');
      const lang = input.language && input.language !== 'auto' ? String(input.language).slice(0, 2) : null;
      if (lang) form.append('language', lang);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}` },
          body: form,
          signal: controller.signal,
        });
      } catch (err) {
        if (err && err.name === 'AbortError') throw new AiTimeoutError(timeoutMs, err);
        throw new AiProviderError('Could not reach the transcription provider.', { retryable: true, cause: err });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        throw new AiProviderError('The transcription provider returned an error.', {
          status: res.status === 429 ? 429 : 502,
          retryable: res.status === 429 || res.status >= 500,
          details: { providerStatus: res.status },
        });
      }
      const json = await res.json();
      const detected = WHISPER_LANGUAGE_CODES[String(json.language || '').toLowerCase()] || json.language || null;
      return {
        text: String(json.text || '').trim(),
        language: lang || detected,
        durationSec: typeof json.duration === 'number' ? json.duration : null,
        segments: (json.segments || []).map((s) => ({ start: s.start, end: s.end, text: String(s.text || '').trim() })),
        model,
      };
    },
  };
}

/** AI_TRANSCRIPTION_PROVIDER = whisper | stub | none (default). */
function createTranscriberFromEnv(env = process.env) {
  const name = String(env.AI_TRANSCRIPTION_PROVIDER || 'none').toLowerCase();
  if (name === 'whisper') return createWhisperTranscriber({ apiKey: env.OPENAI_API_KEY, model: env.AI_TRANSCRIPTION_MODEL || 'whisper-1', timeoutMs: Number(env.AI_TRANSCRIPTION_TIMEOUT_MS) || 120000 });
  if (name === 'stub') return createStubTranscriber();
  return createUnconfiguredTranscriber();
}

module.exports = { createTranscriberFromEnv, createUnconfiguredTranscriber, createStubTranscriber, createWhisperTranscriber, validateAudio, MAX_AUDIO_BYTES, SUPPORTED_MIME };
