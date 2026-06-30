import { NextResponse } from 'next/server';
import { STRAPI_API_URL } from '../../../../lib/strapiConfig';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET(_request, { params }) {
  const page = await fetchHtmlPage(params.slug);
  if (!page?.htmlSource) {
    return NextResponse.json({ error: 'HTML documentation not found' }, { status: 404 });
  }

  return new NextResponse(page.htmlSource, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}

async function fetchHtmlPage(slug) {
  try {
    const res = await fetch(`${STRAPI_API_URL}/api/documentation-pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}
