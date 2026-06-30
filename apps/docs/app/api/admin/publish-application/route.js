import { NextResponse } from 'next/server';
import { verifyDocsAdminRequest } from '../../../../lib/authServer';
import { getSiteContent, writeSiteContentFile } from '../../../../lib/siteContent';
import { extractReadmeMetadata } from '../../../../lib/readmeMetadata';

export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await verifyDocsAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'README file is required' }, { status: 400 });
    }

    const markdown = await file.text();
    const suggested = extractReadmeMetadata(markdown);

    const payload = {
      title: String(form.get('title') || suggested.title),
      slug: String(form.get('slug') || suggested.slug),
      tagline: String(form.get('tagline') || suggested.tagline),
      description: String(form.get('description') || suggested.description),
      color: String(form.get('color') || suggested.color || '#F5630F'),
      category: String(form.get('category') || suggested.category || 'Applications'),
      status: String(form.get('status') || 'published'),
      order: String(form.get('order') || '0'),
      features: String(
        form.get('features') ||
          JSON.stringify(
            (suggested.suggestedFeatures || []).map((feature) => ({
              title: feature,
              description: '',
            }))
          )
      ),
      gettingStarted: String(
        form.get('gettingStarted') ||
          JSON.stringify(
            (suggested.suggestedGettingStarted || []).map((step) => ({
              title: step,
              description: '',
            }))
          )
      ),
      blocks: String(form.get('blocks') || '[]'),
    };

    const backendForm = new FormData();
    backendForm.append('file', new Blob([await file.arrayBuffer()]), file.name || 'README.md');
    Object.entries(payload).forEach(([key, value]) => backendForm.append(key, value));

    const upstream = await fetch(`${request.nextUrl.origin}/api/backend/documentation/publish-application`, {
      method: 'POST',
      headers: {
        authorization: request.headers.get('authorization') || '',
      },
      body: backendForm,
    });

    const responseJson = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: responseJson?.error?.message || responseJson?.error || 'Publish failed' },
        { status: upstream.status }
      );
    }

    await syncSiteContentApplication(payload);
    return NextResponse.json({
      data: responseJson.data,
      suggestion: suggested,
      message: 'Application published and site content synchronized',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to publish application' },
      { status: 400 }
    );
  }
}

async function syncSiteContentApplication(payload) {
  const content = await getSiteContent();
  if (!content.applications) content.applications = {};

  const existing = content.applications[payload.slug] || {};
  const features = parseJsonArray(payload.features).map((feature) =>
    typeof feature === 'string'
      ? { title: feature, description: '' }
      : feature
  );
  const gettingStarted = parseJsonArray(payload.gettingStarted).map((step) =>
    typeof step === 'string'
      ? { title: step, description: '' }
      : step
  );
  content.applications[payload.slug] = {
    ...existing,
    name: payload.title,
    slug: payload.slug,
    tagline: payload.tagline,
    description: payload.description,
    color: payload.color,
    features: features.length > 0 ? features : existing.features || [],
    gettingStarted: gettingStarted.length > 0 ? gettingStarted : existing.gettingStarted || [],
    blocks: parseJsonArray(payload.blocks).length > 0 ? parseJsonArray(payload.blocks) : existing.blocks || [],
  };

  const appsSection = content.navigation?.find((section) => section.key === 'applications');
  if (appsSection) {
    const appHref = `/applications/${payload.slug}`;

    if (!appsSection.items.some((item) => item.href === appHref)) {
      appsSection.items.push({
        label: `${payload.title}`,
        href: appHref,
      });
    }
  }

  await writeSiteContentFile(content);
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
