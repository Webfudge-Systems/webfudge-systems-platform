const localOrigins = [
  'http://localhost:3000', // Landing
  'http://localhost:3003', // Accounts
  'http://localhost:3004', // Vendor
  'http://localhost:3006', // PM
  'http://localhost:3007', // CRM
];

// CORS_ORIGINS (comma-separated) pins this deployment to its own frontends, e.g. the SaaS API
// only accepts the SaaS apps. Unset keeps the original allow-list below (internal deployment).
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, '').toLowerCase())
  .filter(Boolean);

const defaultAllowedOrigins = [
  ...localOrigins,
  'https://webfudge.in',
  'https://www.webfudge.in',
  'https://crm.webfudge.in',
  'https://pm.webfudge.in',
  'https://accounts.webfudge.in',
  'https://vendor.webfudge.in',
  'https://api.webfudge.in',
  'https://webfudgesystems.in',
  'https://www.webfudgesystems.in',
];

const defaultAllowedOriginPatterns = [
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/[a-z0-9-]+\.webfudge\.in$/,
  /^https:\/\/[a-z0-9-]+\.webfudgesystems\.in$/,
];

const allowedOrigins = envOrigins.length ? [...localOrigins, ...envOrigins] : defaultAllowedOrigins;
const allowedOriginPatterns = envOrigins.length ? [] : defaultAllowedOriginPatterns;

module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://*.amazonaws.com',
            'https://*.cloudfront.net',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'https://*.amazonaws.com',
            'https://*.cloudfront.net',
          ],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: (ctx) => {
        const requestOrigin = ctx.request.header.origin;

        if (!requestOrigin) {
          return '*';
        }

        if (allowedOrigins.includes(requestOrigin)) {
          return requestOrigin;
        }

        if (allowedOriginPatterns.some((pattern) => pattern.test(requestOrigin))) {
          return requestOrigin;
        }

        return '';
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'X-Organization-Id', // CRM / apps send active org; must match preflight Allow-Headers
      ],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    // Keeps the raw request body for verifying Razorpay webhook signatures.
    config: { includeUnparsed: true },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::jwt-auth', // Custom JWT authentication middleware
  'global::app-access', // SaaS: trial / plan / lock rules per app (no-op on Internal)
  'global::api-cache', // Redis cache for GET /api/* (leads, contacts, tasks, projects, …)
];
