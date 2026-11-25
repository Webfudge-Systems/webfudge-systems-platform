import { NextResponse } from 'next/server';
import { STRAPI_API_URL } from '../../../../lib/strapiConfig';
import { verifyDocsAdminRequest } from '../../../../lib/authServer';

export const runtime = 'nodejs';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function proxyRequest(request, { params }) {
  const path = (params.path || []).join('/');
  const method = request.method;

  if (MUTATION_METHODS.has(method)) {
    const auth = await verifyDocsAdminRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: { message: auth.error } }, { status: 401 });
    }
  }

  const targetUrl = `${STRAPI_API_URL}/api/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  const forwardHeaders = ['authorization', 'content-type', 'accept'];
  for (const name of forwardHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (process.env.DOCS_INTERNAL_API_KEY) {
    headers.set('x-docs-admin-verified', process.env.DOCS_INTERNAL_API_KEY);
  }

  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, { method, headers, body });
    const responseBody = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          message: `Cannot reach Strapi at ${STRAPI_API_URL}. Start the backend with: npm run dev (in apps/backend).`,
          details: err.message,
        },
      },
      { status: 502 }
    );
  }
}

export async function GET(request, context) {
  return proxyRequest(request, context);
}

export async function POST(request, context) {
  return proxyRequest(request, context);
}

export async function PUT(request, context) {
  return proxyRequest(request, context);
}

export async function DELETE(request, context) {
  return proxyRequest(request, context);
}

export async function PATCH(request, context) {
  return proxyRequest(request, context);
}
