import { NextResponse } from 'next/server';
import { verifyDocsAdminRequest } from '../../../../lib/authServer';
import { extractReadmeMetadata } from '../../../../lib/readmeMetadata';

export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await verifyDocsAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let markdown = '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (file && typeof file.text === 'function') {
        markdown = await file.text();
      } else {
        markdown = String(form.get('markdown') || '');
      }
    } else {
      const body = await request.json();
      markdown = String(body?.markdown || '');
    }

    const data = extractReadmeMetadata(markdown);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to extract metadata' },
      { status: 400 }
    );
  }
}
