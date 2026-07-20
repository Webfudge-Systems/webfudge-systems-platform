import { NextResponse } from 'next/server';
import { verifyDocsAdminRequest } from '../../../../lib/authServer';
import { getSiteContent, writeSiteContentFile } from '../../../../lib/siteContent';

export const runtime = 'nodejs';

export async function DELETE(request) {
  const auth = await verifyDocsAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Missing application slug' }, { status: 400 });
    }

    const content = await getSiteContent();
    let updated = false;

    // 1. Remove from applications list
    if (content.applications && content.applications[slug]) {
      delete content.applications[slug];
      updated = true;
    }

    // 2. Remove from navigation (sidebar)
    if (Array.isArray(content.navigation)) {
      for (const section of content.navigation) {
        if (Array.isArray(section.items)) {
          const initialLength = section.items.length;
          section.items = section.items.filter(item => {
            // Remove application links and any child page links if desired
            return item.href !== `/applications/${slug}`;
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

    return NextResponse.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
