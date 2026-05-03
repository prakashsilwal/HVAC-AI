import { google } from 'googleapis'
import type { Json } from '@/lib/database.types'
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

  // Auto-refresh: Google only sends refresh_token once, so merge into existing
  client.on('tokens', async (newTokens) => {
    try {
      const existing = (data.gcal_token as Record<string, unknown>) ?? {}
      // Spread order: existing first so new tokens overwrite stale access_token/expiry
      const merged = { ...existing, ...newTokens }
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ gcal_token: merged as unknown as Json })
        .eq('id', businessId)

      if (updateError) {
        console.error('[google/oauth] Failed to persist refreshed token:', updateError.message)
      }
    } catch (err) {
      console.error('[google/oauth] Token refresh handler error:', err)
    }
  })

  return client
}

// Exchange auth code for tokens and persist to the business row
export async function exchangeCodeAndStore(code: string, businessId: string): Promise<void> {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('businesses')
    .update({ gcal_token: tokens as unknown as Json })
    .eq('id', businessId)

  if (error) {
    throw new Error(`Failed to store Google tokens: ${error.message}`)
  }
}
