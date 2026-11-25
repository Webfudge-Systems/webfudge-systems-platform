import { strapiClient } from '../strapiClient';

/**
 * Fetch all published documentation pages (sidebar nav + listing).
 */
export async function getPublishedPages() {
  try {
    const res = await strapiClient.get('/documentation-pages');
    return res?.data || [];
  } catch (err) {
    console.error('[documentationService] getPublishedPages error:', err);
    return [];
  }
}

/**
 * Fetch a single documentation page by slug or numeric id.
 */
export async function getPageBySlug(slug) {
  try {
    const res = await strapiClient.get(`/documentation-pages/${slug}`);
    return res?.data || null;
  } catch (err) {
    if (err.message?.includes('404')) return null;
    console.error('[documentationService] getPageBySlug error:', err);
    return null;
  }
}

/**
 * Full-text search across published pages.
 */
export async function searchPages(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await strapiClient.get('/documentation/search', { q: query, mode: 'hybrid' });
    return res?.data || [];
  } catch (err) {
    console.error('[documentationService] searchPages error:', err);
    return [];
  }
}

export async function getFeedback(limit = 50) {
  try {
    const res = await strapiClient.get('/documentation/feedback', { limit });
    return res?.data || [];
  } catch (err) {
    console.error('[documentationService] getFeedback error:', err);
    return [];
  }
}

export async function submitFeedback(feedback) {
  const res = await strapiClient.post('/documentation/feedback', feedback);
  return res?.data;
}

/**
 * Fetch all apps (for admin dropdowns).
 */
export async function getApps() {
  try {
    const res = await strapiClient.get('/documentation/apps');
    return res?.data || [];
  } catch (err) {
    console.error('[documentationService] getApps error:', err);
    return [];
  }
}

/* ── Admin mutations ──────────────────────────────────────────────── */

export async function createPage(data) {
  const res = await strapiClient.post('/documentation-pages', data);
  return res?.data;
}

export async function updatePage(id, data) {
  const res = await strapiClient.put(`/documentation-pages/${id}`, data);
  return res?.data;
}

function adminAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth-token') || localStorage.getItem('strapi_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function deletePage(id) {
  // Route through the same admin proxy path that create/update use, which has a
  // proven auth path (verifyDocsAdminRequest + forwarded token). Cascades
  // embeddings/feedback cleanup are handled by the Strapi controller.
  const res = await strapiClient.delete(`/documentation-pages/${id}`);
  return res?.data ?? res;
}

export async function deleteApp(slug) {
  const res = await fetch(`/api/admin/delete-application?slug=${slug}`, {
    method: 'DELETE',
    headers: adminAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete application');
  }
  return data;
}

export async function uploadMarkdown(formData) {
  const res = await strapiClient.postForm('/documentation/upload-markdown', formData);
  return res?.data;
}

export async function publishHtmlDocumentation(data) {
  try {
    const res = await strapiClient.post('/documentation/publish-html', data);
    return res?.data;
  } catch (err) {
    // Older running Strapi instances do not know the new publish-html route
    // until restart, so publish via the existing app + page endpoints.
    if (!String(err.message || '').includes('405')) throw err;
    return publishHtmlDocumentationFallback(data);
  }
}

async function publishHtmlDocumentationFallback(data) {
  let applicationId = null;

  if (data.category === 'Applications') {
    const details = data.applicationDetails || {};
    const appName = details.name || data.title;
    const appSlug = slugify(details.slug || appName);

    if (!appName || !appSlug) {
      throw new Error('Application name is required');
    }

    const appsRes = await strapiClient.get('/documentation/apps');
    const existing = (appsRes?.data || []).find((app) => app.slug === appSlug);

    if (existing?.id) {
      applicationId = existing.id;
    } else {
      const createdApp = await strapiClient.post('/apps', {
        name: appName,
        slug: appSlug,
        description: details.description || data.description || '',
        category: 'Applications',
        color: details.color || '#2563eb',
        isActive: true,
        order: 0,
        features: [],
      });
      applicationId = createdApp?.data?.id || createdApp?.id || null;
    }
  }

  const page = await strapiClient.post('/documentation-pages', {
    title: data.title,
    description: data.description || '',
    content: data.content || data.description || '',
    contentBlocks: Array.isArray(data.contentBlocks) ? data.contentBlocks : [],
    category: data.category || 'Getting Started',
    status: data.status || 'published',
    sourceType: 'html',
    htmlSource: data.htmlSource || data.rawHtml || '',
    htmlFileName: data.htmlFileName || '',
    htmlDisplayMode: data.htmlDisplayMode === 'raw' ? 'raw' : 'themed',
    sourceHash: data.sourceHash || '',
    ...(applicationId ? { application: applicationId } : {}),
  });

  return page?.data || page;
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Fetch all pages including draft/archived (admin view).
 */
export async function getAllPages() {
  try {
    const res = await strapiClient.get('/documentation-pages');
    return res?.data || [];
  } catch (err) {
    console.error('[documentationService] getAllPages error:', err);
    return [];
  }
}
