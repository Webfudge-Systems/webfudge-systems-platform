# @webfudge/meta-ads

Server-side helpers for Meta (Facebook) Lead Ads, used by the Strapi backend for Grow's Meta Lead Ads
capture (ticket G6). Plain CommonJS on Node's built-in `fetch` and `crypto`, no dependencies.

Recovered from commit `21a4cc4` (where it served the removed real-estate CRM, dropped in `7f1d91f`) and
adapted for Grow: CommonJS instead of TypeScript so Strapi can `require` it, Page/form/backfill/subscription
calls, `appsecret_proof`, signed OAuth state, and generic lead-company/contact field mapping instead of the
real-estate fields.

Security invariants: tokens and lead PII are never logged; webhook signatures and OAuth state are
compared in constant time; CAPI email/phone are SHA-256 hashed before leaving the process.

```js
const meta = require('@webfudge/meta-ads')

// Webhooks: GET handshake, then verify every POST against the RAW body
meta.verifyWebhookChallenge(query, process.env.META_WEBHOOK_VERIFY_TOKEN) // { ok, challenge }
meta.verifyWebhookSignature(rawBody, req.headers['x-hub-signature-256'], appSecret) // boolean
meta.extractLeadgenEvents(JSON.parse(rawBody)) // [{ leadgenId, formId, pageId, adId, adgroupId }]

// OAuth
const state = meta.signState({ orgId, userId }, appSecret) // expires in 10 min
const url = meta.getOAuthUrl(state, redirectUri, { appId })
const { accessToken, expiresIn } = await meta.exchangeCodeForToken(code, { appId, appSecret, redirectUri })

// Graph
const user = meta.createMetaClient(accessToken, { appSecret })
const pages = await user.listPages() // [{ id, name, access_token }]
const page = meta.createMetaClient(pages[0].access_token, { appSecret })
await page.subscribePage(pages[0].id) // leadgen webhook
const forms = await page.listLeadForms(pages[0].id) // incl. questions
const lead = await page.fetchLeadById(leadgenId) // field_data + campaign/adset/ad ids and names
const recent = await page.listFormLeads(formId, { since: unixSeconds }) // backfill

// Field mapping: per-form { questionKey: target } over built-in aliases
const mapped = meta.mapFieldData(lead.field_data, { budget: 'custom:budget', city: 'notes' })
// → { contact, lead, customFields, utm, unmappedAnswers }
meta.suggestMapping(forms[0].questions) // pre-fill for the settings UI
```

Targets: `fullName`, `firstName`, `lastName`, `email`, `phone`, `jobTitle`, `companyName`, `website`,
`industry`, `address`, `city`, `state`, `country`, `zipCode`, `notes`, `ignore`, `custom:<key>`.

Tests: `npm test --workspace=@webfudge/meta-ads` (node:test, no install needed).
