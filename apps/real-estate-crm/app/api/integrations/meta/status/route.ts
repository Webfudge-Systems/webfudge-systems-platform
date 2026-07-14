import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Reports which pieces of the Meta integration are configured on the server.
 * Booleans only — never returns the secrets themselves.
 */
export async function GET() {
  return NextResponse.json({
    appConfigured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    accessTokenConfigured: Boolean(process.env.META_ACCESS_TOKEN),
    verifyTokenConfigured: Boolean(process.env.META_VERIFY_TOKEN),
    webhookSecretConfigured: Boolean(process.env.RE_WEBHOOK_SECRET),
    pixelConfigured: Boolean(process.env.META_PIXEL_ID),
  })
}
