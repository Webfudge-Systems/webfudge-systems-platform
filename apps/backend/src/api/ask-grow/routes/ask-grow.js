'use strict';

/** G20 Ask Grow (Cmd+K lead questions) + Draft anything. SaaS only. Auth via global jwt-auth middleware. */
const route = (method, path, handler) => ({ method, path, handler: `ask-grow.${handler}`, config: { auth: false, policies: [], middlewares: [] } });

module.exports = {
  routes: [
    route('POST', '/ask-grow/query', 'query'),
    route('POST', '/ask-grow/run', 'run'),
    route('POST', '/ask-grow/draft', 'draft'),
    route('GET', '/ask-grow/brand-tone', 'getBrandTone'),
    route('PUT', '/ask-grow/brand-tone', 'setBrandTone'),
  ],
};
