'use strict';

/**
 * Prompt-template registry, one namespace per app: grow (Fudge Grow / CRM), work (Fudge Work / PM),
 * connect (Fudge Connect). A template keeps its prompt, routing and output schema together so a
 * feature ticket only picks a key and passes variables:
 *
 *   const t = renderTemplate('grow.lead_score', { lead }, { language: 'hi' });
 *   const { object } = await generateObject(ai, { ...t, feature: 'grow.lead_score' });
 *
 * Output language: 'en' (default), 'hi' (Hindi) or 'mr' (Marathi). The language instruction goes in
 * the user message, not the system prompt, so the cached system prefix is shared by all languages.
 * Free-text fields come back in that language; JSON keys and enum values stay in English.
 */

const APPS = ['grow', 'work', 'connect'];

const LANGUAGES = {
  en: { name: 'English', instruction: 'Write every free-text value in clear, simple English.' },
  hi: {
    name: 'Hindi',
    instruction:
      'Write every free-text value in Hindi (हिन्दी, Devanagari script). Keep JSON keys, enum values, numbers, names and product terms exactly as given.',
  },
  mr: {
    name: 'Marathi',
    instruction:
      'Write every free-text value in Marathi (मराठी, Devanagari script). Keep JSON keys, enum values, numbers, names and product terms exactly as given.',
  },
};

const registry = new Map();

function normalizeLanguage(lang) {
  const code = String(lang || 'en').toLowerCase().slice(0, 2);
  return LANGUAGES[code] ? code : 'en';
}

/**
 * @param {object} t
 * @param {string} t.key        "<app>.<name>", app one of grow | work | connect
 * @param {string} t.task       routing task (score, extract, draft, ...) or set `tier`
 * @param {string} [t.tier]
 * @param {string} t.system     stable system prompt (cached)
 * @param {(vars:object)=>string} t.user   builds the user message from variables
 * @param {object} [t.schema]   JSON schema when the template returns structured data
 * @param {number} [t.maxTokens]
 * @param {string} [t.description]
 */
function registerTemplate(t) {
  const [app] = String(t.key || '').split('.');
  if (!APPS.includes(app)) throw new Error(`Template key "${t.key}" must start with one of: ${APPS.join(', ')}`);
  if (typeof t.user !== 'function') throw new Error(`Template "${t.key}" needs a user(vars) function`);
  if (registry.has(t.key)) throw new Error(`Template "${t.key}" is already registered`);
  registry.set(t.key, Object.freeze({ ...t, app }));
  return registry.get(t.key);
}

function getTemplate(key) {
  const t = registry.get(key);
  if (!t) throw new Error(`Unknown AI template "${key}"`);
  return t;
}

function listTemplates(app) {
  return [...registry.values()].filter((t) => !app || t.app === app).map((t) => ({ key: t.key, app: t.app, task: t.task, tier: t.tier, description: t.description || '' }));
}

/**
 * Turns a template into generate()/generateObject() options.
 * @returns {{ task, tier, system, prompt, schema, maxTokens, language, template }}
 */
function renderTemplate(key, vars = {}, { language } = {}) {
  const t = getTemplate(key);
  const lang = normalizeLanguage(language);
  const body = t.user(vars);
  return {
    task: t.task,
    tier: t.tier,
    system: t.system,
    prompt: `${body}\n\nOutput language: ${LANGUAGES[lang].name}. ${LANGUAGES[lang].instruction}`,
    schema: t.schema,
    maxTokens: t.maxTokens,
    language: lang,
    template: key,
  };
}

module.exports = { APPS, LANGUAGES, registerTemplate, getTemplate, listTemplates, renderTemplate, normalizeLanguage, _registry: registry };

// Built-in templates register themselves.
require('./grow');
require('./work');
require('./work-triage');
require('./work-risk'); // W19 risk radar + scope-creep watcher
