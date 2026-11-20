import { getStrapiApiBase } from './strapiConfig';

const ADMIN_ROLE_NAMES = ['super admin', 'superadmin', 'super_admin', 'admin', 'manager'];

function roleName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name || value.attributes?.name || value.data?.attributes?.name || '';
}

/**
 * Mirror the backend `isDocsAdminUser` matching so a legitimate admin is never
 * rejected by the Next gate while the backend would have accepted them.
 */
function isDocsAdminUser(user) {
  if (!user) return false;
  const candidates = [
    user.userType,
    roleName(user.primaryRole),
    roleName(user.role),
    ...(Array.isArray(user.userRoles) ? user.userRoles.map(roleName) : []),
  ];
  return candidates.some((raw) => {
    const role = String(raw || '').toLowerCase();
    if (!role) return false;
    return ADMIN_ROLE_NAMES.includes(role) || role.includes('admin') || role.includes('super');
  });
}

/**
 * Server-side check: valid Strapi token + admin role.
 */
export async function verifyDocsAdminRequest(request) {
  if (process.env.NEXT_PUBLIC_DOCS_ADMIN_OPEN === 'true') {
    return { ok: true, reason: 'dev-open' };
  }

  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing Strapi auth token' };
  }

  const token = header.slice(7);

  try {
    const apiBase = getStrapiApiBase();
    const res = await fetch(`${apiBase}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Ensure we don't cache auth checks
      cache: 'no-store',
    });

    if (!res.ok) {
      return { ok: false, error: 'Invalid or expired admin token' };
    }

    const payload = await res.json();
    const user = payload?.user || payload;

    if (!isDocsAdminUser(user)) {
      return { ok: false, error: 'Signed in, but this account is not a docs admin' };
    }

    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: err.message || 'Error validating token' };
  }
}
