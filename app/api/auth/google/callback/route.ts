import { type NextRequest, NextResponse } from 'next/server'
import { exchangeCodeAndStore } from '@/lib/google/oauth'

// TODO: restore auth ownership check once Supabase Auth is built
const DEV_BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?gcal_error=${encodeURIComponent(error)}`, request.url),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?gcal_error=missing_code', request.url),
    )
  }

  try {
    await exchangeCodeAndStore(code, DEV_BUSINESS_ID)
    return NextResponse.redirect(
      new URL('/dashboard/settings?gcal_connected=1', request.url),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[google/callback] token exchange failed:', message)
    return NextResponse.redirect(
      new URL(`/dashboard/settings?gcal_error=${encodeURIComponent(message)}`, request.url),
    )
  }
}
