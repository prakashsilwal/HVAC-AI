import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/server'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

export function getAuthUrl(businessId: string): string {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: businessId,
  })
}

// Load stored tokens for a business and return an authenticated OAuth2 client
export async function getAuthenticatedClient(businessId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('gcal_token')
    .eq('id', businessId)
    .single()

  if (error || !data?.gcal_token) {
    throw new Error(`No Google Calendar token for business ${businessId}`)
  }

  const client = createOAuthClient()
  client.setCredentials(data.gcal_token as Record<string, unknown>)

  // Auto-refresh expired access tokens and persist the new ones
  client.on('tokens', async (tokens) => {
    const existing = (data.gcal_token as Record<string, unknown>) ?? {}
    const merged = { ...existing, ...tokens }
    await supabase
      .from('businesses')
      .update({ gcal_token: merged as unknown as import('@/lib/database.types').Json })
      .eq('id', businessId)
  })

  return client
}

// Exchange auth code for tokens and persist to the business row
export async function exchangeCodeAndStore(code: string, businessId: string): Promise<void> {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  const supabase = createServiceClient()
  await supabase
    .from('businesses')
    .update({ gcal_token: tokens as unknown as import('@/lib/database.types').Json })
    .eq('id', businessId)
}
