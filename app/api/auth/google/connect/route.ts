import { type NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google/oauth'

// TODO: restore auth check once Supabase Auth is built
const DEV_BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(_request: NextRequest) {
  const authUrl = getAuthUrl(DEV_BUSINESS_ID)
  return NextResponse.redirect(authUrl)
}
