'use strict';

/**
 * Checks that the core Organizations routes reject unauthenticated and cross-org callers.
 * Registers two throwaway users, so it only runs against a LOCAL Strapi.
 * Usage:
 *   (start Strapi locally against a throwaway SQLite file, e.g. DATABASE_FILENAME=.tmp/test.db)
 *   API_URL=http://127.0.0.1:1337 node scripts/test-organization-auth.js
 */

const base = (process.env.API_URL || 'http://127.0.0.1:1337').replace(/\/$/, '') + '/api';
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(base)) {
  console.error('Refusing to run: API_URL must be a local Strapi (localhost / 127.0.0.1).');
  process.exit(1);
}

async function call(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

async function newUserWithOrg(tag) {
  const name = `orgauth${tag}${Date.now()}`;
  const reg = await call('POST', '/auth/local/register', null, {
    username: name,
    email: `${name}@example.test`,
    password: 'Passw0rd!test',
  });
  const token = reg.json?.jwt;
  if (!token) throw new Error(`register failed: ${JSON.stringify(reg.json)}`);
  const org = await call('POST', '/organizations', token, { name: `Org ${name}` });
  const orgId = org.json?.data?.organization?.id;
  if (!orgId) throw new Error(`create org failed: ${JSON.stringify(org.json)}`);
  return { token, orgId };
}

(async () => {
  const a = await newUserWithOrg('a');
  const b = await newUserWithOrg('b');
  const rename = { data: { name: 'should-not-change' } };

  const checks = [
    ['list, no token', () => call('GET', '/organizations'), [401]],
    ['findOne, no token', () => call('GET', `/organizations/${a.orgId}`), [401]],
    ['update, no token', () => call('PUT', `/organizations/${a.orgId}`, null, rename), [401]],
    ['delete, no token', () => call('DELETE', `/organizations/${a.orgId}`), [401]],
    ['findOne, other org', () => call('GET', `/organizations/${b.orgId}`, a.token), [403]],
    ['update, other org', () => call('PUT', `/organizations/${b.orgId}`, a.token, rename), [403]],
    ['delete, other org', () => call('DELETE', `/organizations/${b.orgId}`, a.token), [403]],
    [
      'list, member sees only own orgs',
      async () => {
        const r = await call('GET', '/organizations', a.token);
        const ids = (r.json?.data || []).map((o) => o.id);
        return { status: ids.length === 1 && ids[0] === a.orgId ? 200 : 500, json: ids };
      },
      [200],
    ],
    ['update, owner of own org', () => call('PUT', `/organizations/${a.orgId}`, a.token, { data: { name: 'Renamed' } }), [200]],
  ];

  let failed = 0;
  for (const [label, run, expected] of checks) {
    const { status, json } = await run();
    const ok = expected.includes(status);
    if (!ok) failed += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${status}${ok ? '' : ` ${JSON.stringify(json).slice(0, 200)}`}`);
  }

  const still = await call('GET', `/organizations/${b.orgId}`, b.token);
  const intact = still.status === 200 && still.json?.data?.name !== 'should-not-change';
  if (!intact) failed += 1;
  console.log(`${intact ? 'PASS' : 'FAIL'}  other org unchanged after attacks`);

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
