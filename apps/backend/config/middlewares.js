module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:3000', // Landing
        'http://localhost:3001', // CRM
        'http://localhost:3002', // PM
        'http://localhost:3003', // Accounts
        'http://localhost:3004', // Vendor
        'https://webfudgesystems.com',
        'https://*.webfudgesystems.com',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::jwt-auth', // Custom JWT authentication middleware
];
