import admin from 'firebase-admin';
import { getAdminEmailAllowlist, isFirebaseDocsAdmin } from '../adminAccess';

let initialized = false;

function initFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return admin.app();
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey && projectId) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else if (projectId) {
    admin.initializeApp({ projectId });
  } else {
    throw new Error('Firebase Admin is not configured (missing project ID).');
  }

  initialized = true;
  return admin.app();
}

export async function verifyFirebaseIdToken(idToken) {
  const app = initFirebaseAdmin();
  return admin.auth(app).verifyIdToken(idToken);
}

/**
 * Server-side check: valid Firebase token + admin allowlist/claim.
 */
export async function verifyDocsAdminRequest(request) {
  if (process.env.NEXT_PUBLIC_DOCS_ADMIN_OPEN === 'true') {
    return { ok: true, reason: 'dev-open' };
  }

  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing Firebase ID token' };
  }

  try {
    const decoded = await verifyFirebaseIdToken(header.slice(7));
    const user = { email: decoded.email, uid: decoded.uid };
    const isAdmin = isFirebaseDocsAdmin(user, decoded);

    if (!isAdmin) {
      return { ok: false, error: 'Signed in, but this account is not a docs admin' };
    }

    return { ok: true, user, claims: decoded };
  } catch (err) {
    return { ok: false, error: err.message || 'Invalid Firebase token' };
  }
}

export function getAdminAllowlistForServer() {
  return getAdminEmailAllowlist();
}
