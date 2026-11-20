import { NextResponse } from 'next/server';
import { verifyDocsAdminRequest } from '../../../../lib/authServer';
import { getSiteContent, writeSiteContentFile } from '../../../../lib/siteContent';
import { STRAPI_API_URL } from '../../../../lib/strapiConfig';

export const runtime = 'nodejs';

export async function DELETE(request) {
  const auth = await verifyDocsAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing page ID' }, { status: 400 });
    }

    // 1. Fetch the page from Strapi to know its slug before we delete it
    const fetchHeaders = {
      'authorization': request.headers.get('authorization') || '',
      'content-type': 'application/json',
      'accept': 'application/json',
    };

    if (process.env.DOCS_INTERNAL_API_KEY) {
      fetchHeaders['x-docs-admin-verified'] = process.env.DOCS_INTERNAL_API_KEY;
    }

    const pageRes = await fetch(`${STRAPI_API_URL}/api/documentation-pages/${id}`, {
      method: 'GET',
      headers: fetchHeaders,
    });

    if (!pageRes.ok) {
      return NextResponse.json({ error: 'Page not found or unable to fetch from backend' }, { status: pageRes.status });
    }

    const pageData = await pageRes.json();
    const slug = pageData?.data?.slug;

    // 2. Delete from Strapi
    const deleteRes = await fetch(`${STRAPI_API_URL}/api/documentation-pages/${id}`, {
      method: 'DELETE',
      headers: fetchHeaders,
    });

    if (!deleteRes.ok) {
      return NextResponse.json({ error: 'Failed to delete page from backend database' }, { status: deleteRes.status });
    }

    // 3. Remove from site-content.json
    if (slug) {
      const content = await getSiteContent();
      let updated = false;

      // Remove from applications list if it matches an application slug
      if (content.applications && content.applications[slug]) {
        delete content.applications[slug];
        updated = true;
      }

      // Remove from navigation (sidebar)
      if (Array.isArray(content.navigation)) {
        for (const section of content.navigation) {
          if (Array.isArray(section.items)) {
            const initialLength = section.items.length;
            section.items = section.items.filter(item => {
              // If the href ends with the slug or matches /applications/${slug}
              return item.href !== `/docs/${slug}` && item.href !== `/applications/${slug}`;
            });
            if (section.items.length !== initialLength) {
              updated = true;
            }
          }
        }
      }

      if (updated) {
        await writeSiteContentFile(content);
      }
    }

    return NextResponse.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
