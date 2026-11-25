# Fudge AI platform (P5)

The foundation every AI feature in Grow, Work and Connect builds on. SaaS only: on the Internal
deployment, and on SaaS until `AI_ENABLED=true`, every AI endpoint answers `403 AI_DISABLED`.

| Piece | Where |
|---|---|
| LLM client, routing, retries, timeouts, prompt caching | `packages/ai/src/client.js`, `models.js`, `providers/` |
| Structured output (JSON schema → validated object) | `packages/ai/src/structured.js` |
| Prompt templates per app, English / Hindi / Marathi output | `packages/ai/src/templates/` |
| Agent actions (permission → audit → undo, approval queue) | `packages/ai/src/actions.js`, wired in `apps/backend/src/utils/ai/actions.js` |
| Business memory (per-org retrieval) | `packages/ai/src/memory.js`, store in `apps/backend/src/utils/ai/memory.js` |
| Voice-note transcription (OpenAI Whisper) | `packages/ai/src/transcription.js`, `apps/backend/src/utils/ai/voice.js` |
| Credit metering against the plan | `apps/backend/src/utils/ai/index.js` |
| HTTP | `/api/ai/*` (`apps/backend/src/api/ai`) and feature routes such as `POST /api/lead-companies/:id/ai-score` |
| UI | Accounts → Apps & billing (AI credits card), Accounts → AI approvals, Grow → Settings → AI approvals (`AiApprovalQueue` in `@webfudge/ui`) |

`@webfudge/ai` is **server-side only**. Never import it from a Next.js app: it reads provider keys
from the environment. Browsers call backend endpoints.

## How a feature ticket uses it

A typical feature is one backend endpoint, one template and (if it changes data or sends
something) one action. Lead scoring (`apps/backend/src/utils/ai/grow.js`) is the worked example.

### 1. Add a template

In `packages/ai/src/templates/<app>.js` (`grow`, `work` or `connect`):

```js
registerTemplate({
  key: 'grow.deal_risk',
  task: 'classify',            // routes to the cheap tier; 'draft' / 'reason' / 'summarize' → strong
  system: 'You are Fudge AI ... (stable text: it is prompt-cached)',
  schema: { type: 'object', properties: { risk: { type: 'string', enum: ['low', 'medium', 'high'] }, why: { type: 'string', maxLength: 300 } }, required: ['risk', 'why'], additionalProperties: false },
  user: ({ deal }) => `Deal:\n${JSON.stringify(deal)}`,   // per-record data goes here, not in system
});
```

Keep the system prompt identical for every record and language so the cached prefix is reused.
The output language instruction is added to the user message by `renderTemplate`.

### 2. Call it from a backend endpoint

```js
const ai = require('../../../utils/ai');
const { renderTemplate, generateObject } = require('@webfudge/ai');

async dealRisk(ctx) {
  if (!ai.requireAiEnabled(ctx)) return ctx.body;          // 401 / 403 AI_DISABLED
  try {
    const deal = /* load, org-scoped, check the user may read it */;
    const t = renderTemplate('grow.deal_risk', { deal }, { language: ctx.request.body?.language }); // 'en' | 'hi' | 'mr'
    const { object, credits } = await generateObject(ai.clientFor(strapi, ctx), {
      ...t,
      feature: 'grow.deal_risk',                            // metering key: <app>.<feature>
      metadata: { subjectType: 'deal', subjectId: deal.id },
    });
    ctx.body = { data: object };
  } catch (err) {
    return ai.sendAiError(ctx, err);                        // 402 credits exhausted, 403, 502, 504 ...
  }
}
```

`ai.clientFor(strapi, ctx)` returns a client metered for the signed-in user's organization: it
checks credits before every call and writes an `ai-usage` row after it. For free text use
`client.generate({ task, feature, system, prompt })` instead of `generateObject`.

### 3. If the AI changes data or sends something: define an action

Never write to the database or send a message directly from AI output. Define an action in
`apps/backend/src/utils/ai/actions.js` (`registerBuiltInActions`):

```js
r.define({
  key: 'grow.deal.set_risk',
  label: 'update the deal risk',
  permission: { app: 'crm', module: 'deals', access: 'write' },   // or async (actor, input) => boolean
  outbound: false,                                                 // true for email / WhatsApp / SMS
  async execute(input, { orgId }) {
    /* write; return what undo needs */
    return { result: {...}, undoData: { dealId, previous }, subject: { type: 'deal', id: dealId }, summary: 'Marked deal "X" high risk' };
  },
  async undo({ dealId, previous }, { orgId }) { /* restore */ },
});
```

Then in the endpoint:

```js
const { getActionRunner, actorFromCtx, assertAllowed } = require('../../../utils/ai/actions');
await assertAllowed(strapi, 'grow.deal.set_risk', actorFromCtx(ctx), { dealId });  // before spending credits
// ... generate ...
const record = await getActionRunner(strapi).propose({ key: 'grow.deal.set_risk', actor: actorFromCtx(ctx), orgId: ctx.state.orgId, input, feature: 'grow.deal_risk', subject: { type: 'deal', id: dealId } });
```

What you get:

- **Permission** is checked as the acting user (their org role and module permissions), at propose
  time and again for whoever approves or undoes.
- **Audit**: a row in the org activity feed (Accounts → Audit logs, and the record's timeline) with
  `meta.actorType = 'ai'`, `meta.actorLabel = 'Fudge AI'` and the human as `actor`.
- **Undo**: `POST /api/ai/actions/:id/undo` when the action defines `undo`.
- **Outbound** (`outbound: true`): the action is stored as `pending_approval` and shows in the
  approval queue. It runs only after `POST /api/ai/actions/:id/approve` (re-checked as the approver;
  a second approve is a 409). `reject` closes it without sending.

### 4. Frontend

- Call your backend endpoint. On a `402` with `details.code === 'AI_CREDITS_EXHAUSTED'`,
  `planErrorDetails(error)` from `@webfudge/ui` returns props for `<UpgradePrompt />` (the upgrade
  link goes to Accounts → Apps & billing).
- Drafts waiting for approval are shown by `<AiApprovalQueue request={...} app="crm" />`.
- The AI score is stored on the lead as `aiScore` (0-100), `aiScoreLabel` (hot / warm / cold),
  `aiScoreReasons` (`{ reasons, nextStep, model, language }`) and `aiScoredAt`.

## Model routing

| Tier | Tasks | Default model | Env override |
|---|---|---|---|
| cheap | classify, extract, score, tag, translate, route | `claude-haiku-5-5` (effort `low`) | `AI_MODEL_CHEAP` |
| strong | reason, draft, summarize, plan, chat (and any unknown task) | `claude-sonnet-5-5` | `AI_MODEL_STRONG` |
| premium | only when a feature asks for `tier: 'premium'` | `claude-opus-5-5` | `AI_MODEL_PREMIUM` |

Precedence: explicit `model` > explicit `tier` > tier of `task`. Each attempt has a timeout
(`AI_TIMEOUT_MS`, default 60 s); 408/409/429/5xx and network errors are retried with exponential
backoff (`AI_MAX_RETRIES`, default 2). Refusals are not retried; on Sonnet/Opus 5.5 the server-side
refusal fallback is on (`AI_REFUSAL_FALLBACK=off` disables it). The system prompt is sent with
`cache_control` so repeated calls with the same template hit the prompt cache.

## Credits

- Every model call writes an `ai-usage` row: org, user, feature, model, tokens in/out, cache tokens,
  USD cost, credits, latency, status.
- Credits = cost ÷ `AI_CREDIT_USD` (default $0.01), rounded up, minimum `AI_MIN_CREDITS_PER_CALL`
  (default 1). A Haiku lead score costs well under $0.01, so it is 1 credit.
- Monthly allowance = sum of `aiCreditsMonthly` over the apps the org has **full** access to (plan
  rows in the Strapi admin; defaults Free 0, Pro 100, Business 1000 per app; a 14-day trial gets
  100 per app, from `PLAN_LIMITS.<app>.trial` in `utils/saas-plans.js`).
- Before each call the org's credits for the current month (`AI_CREDIT_TIMEZONE`, default
  Asia/Kolkata) are summed; at the allowance the call is refused with `402 AI_CREDITS_EXHAUSTED`
  and the provider is never reached. Months are a column on the usage row, so the reset needs no job.
- The check runs before the call, so concurrent calls can go over by at most one call each.
- `GET /api/ai/usage` returns `{ enabled, period, resetsOn, allowance, used, remaining, byFeature, byApp }`
  (no USD figures: those are our costs, not the customer's).

## Business memory

`getMemory(strapi).index(orgId, { sourceType, sourceId, text, metadata })` and
`.search(orgId, query, { k, sourceTypes })`. Re-indexing a source replaces its chunks. Lead scoring
indexes the lead it scores and reads the top matches as context. `POST /api/ai/memory/search`
(managers/admins) exposes search for debugging and future features.

- Embeddings: production uses **Voyage AI** (`AI_EMBEDDINGS_PROVIDER=voyage`, `VOYAGE_API_KEY`,
  model `voyage-3.5-lite`, multilingual). With nothing set it falls back to `hash`: local and free,
  hashed word and bigram features, lexical rather than semantic (used in tests and local dev).
  Switching the embedder means re-indexing (search only compares vectors of the same model).
- Storage: `ai_memory_chunks` with the embedding as JSON and cosine ranking in Node (works on SQLite
  and Postgres; scans up to `AI_MEMORY_SCAN_LIMIT` chunks per org). On Postgres with the `vector`
  extension installed, vectors also go to `ai_memory_vectors` and search runs in SQL. The code never
  runs `CREATE EXTENSION`.

## Voice notes

Vendor: **OpenAI Whisper** (`AI_TRANSCRIPTION_PROVIDER=whisper`, `OPENAI_API_KEY`, model
`whisper-1`). Hindi, Marathi and English are supported; pass the language when the user picked one,
otherwise Whisper detects it.

- HTTP: `POST /api/ai/transcribe`, multipart with `audio` (webm, ogg, mp3, m4a, wav, aac; up to
  25 MB) and optional `language` (`en` | `hi` | `mr` | `auto`). Returns
  `{ text, language, durationSec, segments, creditsUsed }`.
- In backend code: `transcribeVoiceNote(strapi, ctx, { audio, mimeType, language })` from
  `utils/ai/voice.js`.
- Metered as feature `voice.transcribe`, by audio minute: minutes × `AI_TRANSCRIPTION_USD_PER_MIN`
  (default $0.006), turned into credits like model calls (minimum 1 per note). A 2-minute note is
  2 credits.
- Without a provider set it answers `AI_NOT_CONFIGURED`; `AI_TRANSCRIPTION_PROVIDER=stub` returns
  fixed text for demos.

## Testing without a key

- `packages/ai`: `npm test` (mock provider; routing, metering, structured retry, actions, memory,
  templates).
- Backend: `npm run test:ai` in `apps/backend` boots Strapi on a throwaway SQLite database with
  `PLATFORM_MODE=saas` and a mocked provider and checks the whole flow.
- Locally: `AI_ENABLED=true AI_PROVIDER=mock` gives plausible scripted answers for the built-in
  templates.

## Product decisions (confirmed 2026-11-25)

All of these stay configurable.

1. **Credit price**: 1 credit = $0.01 of model cost, minimum 1 per call (`AI_CREDIT_USD`,
   `AI_MIN_CREDITS_PER_CALL`).
2. **Monthly credits per app** (plan rows): Free 0, Pro 100, Business 1000, and 100 during a trial.
3. **Pooled credits**: an org's credits are the sum across its apps and any feature can use them.
4. **Embeddings**: Voyage AI.
5. **Transcription**: OpenAI Whisper.
6. **Default models**: Haiku 5.5 for the cheap tier, Sonnet 5.5 for the strong tier.
