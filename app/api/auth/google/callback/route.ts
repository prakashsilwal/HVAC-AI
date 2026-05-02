import { type NextRequest, NextResponse } from 'next/server'
import { exchangeCodeAndStore } from '@/lib/google/oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code       = searchParams.get('code')
  const businessId = searchParams.get('state')
  const error      = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?gcal_error=${encodeURIComponent(error)}`, request.url),
    )
  }

  if (!code || !businessId) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?gcal_error=missing_params', request.url),
    )
  }

  try {
    await exchangeCodeAndStore(code, businessId)
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
