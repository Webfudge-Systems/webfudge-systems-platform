import { NextResponse } from 'next/server';
import { getSiteContent, writeSiteContentFile } from '../../../lib/siteContent';
import { verifyDocsAdminRequest } from '../../../lib/authServer';

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json({ data: content });
}

export async function PUT(request) {
  const auth = await verifyDocsAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = body?.data;
    if (!content || typeof content !== 'object') {
      return NextResponse.json({ error: 'Invalid content payload' }, { status: 400 });
    }

    await writeSiteContentFile(content);
    return NextResponse.json({ data: content, message: 'Site content saved' });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to save' }, { status: 500 });
  }
}
