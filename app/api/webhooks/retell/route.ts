import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { CallInsert, Json } from '@/lib/database.types'

// ── Retell webhook payload types ─────────────────────────────
type RetellTranscriptTurn = {
  role: 'agent' | 'user'
  content: string
  words?: Array<{ word: string; start: number; end: number }>
}

type RetellCallAnalysis = {
  call_summary?: string
  user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
  call_successful?: boolean
  in_voicemail?: boolean
  custom_analysis_data?: Record<string, unknown>
}

type RetellWebhookPayload = {
  event: 'call_started' | 'call_ended' | 'call_analyzed'
  call: {
    call_id: string
    call_type: 'web_call' | 'phone_call'
    call_status: 'registered' | 'ongoing' | 'ended' | 'error'
    agent_id: string
    from_number?: string
    to_number?: string
    start_timestamp?: number
    end_timestamp?: number
    duration_ms?: number
    recording_url?: string
    transcript?: string
    transcript_object?: RetellTranscriptTurn[]
    call_analysis?: RetellCallAnalysis
    disconnection_reason?: string
    metadata?: {
      business_id?: string
      [key: string]: unknown
    }
    retell_llm_dynamic_variables?: {
      business_id?: string
      business_name?: string
      [key: string]: unknown
    }
  }
}

// ── Signature verification ────────────────────────────────────
function verifyRetellSignature(
  rawBody: string,
  signature: string | null,
  apiKey: string,
): boolean {
  if (!signature) return false
  // Retell signs with HMAC-SHA256 of the raw body using the API key
  // For now we verify the key is present — replace with full HMAC when
  // RETELL_WEBHOOK_SECRET is provisioned in the dashboard
  if (process.env.RETELL_WEBHOOK_SECRET) {
    try {
      const crypto = require('crypto') as typeof import('crypto')
      const expected = crypto
        .createHmac('sha256', process.env.RETELL_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex')
      return signature === expected
    } catch {
      return false
    }
  }
  // Dev fallback — skip signature check if no secret configured
  console.warn('[retell/webhook] RETELL_WEBHOOK_SECRET not set — skipping signature check')
  return true
}

// ── Sentiment normaliser ──────────────────────────────────────
function normaliseSentiment(
  raw: string | undefined,
): 'positive' | 'neutral' | 'frustrated' | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'positive') return 'positive'
  if (lower === 'negative') return 'frustrated'
  return 'neutral'
}

// ── Main handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-retell-signature')

  console.log('[retell/webhook] Incoming webhook')
  console.log('[retell/webhook] Signature header:', signature)

  if (
    !verifyRetellSignature(
      rawBody,
      signature,
      process.env.RETELL_API_KEY ?? '',
    )
  ) {
    console.error('[retell/webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: RetellWebhookPayload
  try {
    payload = JSON.parse(rawBody) as RetellWebhookPayload
  } catch {
    console.error('[retell/webhook] Failed to parse JSON body:', rawBody.slice(0, 200))
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[retell/webhook] Event:', payload.event)
  console.log('[retell/webhook] Call ID:', payload.call?.call_id)
  console.log('[retell/webhook] Full payload:', JSON.stringify(payload, null, 2))

  const { event, call } = payload

  // Resolve business_id from multiple possible locations in the payload
  const businessId =
    call.metadata?.business_id ??
    call.retell_llm_dynamic_variables?.business_id ??
    '00000000-0000-0000-0000-000000000001'

  console.log('[retell/webhook] Resolved business_id:', businessId)

  const supabase = createServiceClient()

  // ── call_started ────────────────────────────────────────────
  if (event === 'call_started') {
    const callRow: CallInsert = {
      retell_call_id: call.call_id,
      business_id: businessId,
      caller_number: call.from_number ?? 'unknown',
      call_type: 'inbound',
      status: 'ongoing',
      started_at: call.start_timestamp
        ? new Date(call.start_timestamp).toISOString()
        : new Date().toISOString(),
      retell_metadata: call as unknown as Json,
    }
    const { error } = await supabase
      .from('calls')
      .upsert(callRow, { onConflict: 'retell_call_id' })

    if (error) {
      console.error('[retell/webhook] call_started insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[retell/webhook] call_started saved ✅')
  }

  // ── call_ended ──────────────────────────────────────────────
  if (event === 'call_ended') {
    const durationSeconds = call.duration_ms
      ? Math.round(call.duration_ms / 1000)
      : call.start_timestamp && call.end_timestamp
        ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
        : null

    const endedCallRow: CallInsert = {
      retell_call_id: call.call_id,
      business_id: businessId,
      caller_number: call.from_number ?? 'unknown',
      call_type: 'inbound',
      status: 'completed',
      started_at: call.start_timestamp
        ? new Date(call.start_timestamp).toISOString()
        : null,
      ended_at: call.end_timestamp
        ? new Date(call.end_timestamp).toISOString()
        : new Date().toISOString(),
      duration_seconds: durationSeconds,
      recording_url: call.recording_url ?? null,
      retell_metadata: call as unknown as Json,
    }
    const { error: callError } = await supabase
      .from('calls')
      .upsert(endedCallRow, { onConflict: 'retell_call_id' })

    if (callError) {
      console.error('[retell/webhook] call_ended upsert error:', callError)
      return NextResponse.json({ error: callError.message }, { status: 500 })
    }

    console.log('[retell/webhook] call_ended saved ✅')

    // Save transcript if present
    if (call.transcript_object && call.transcript_object.length > 0) {
      const { data: callRow } = await supabase
        .from('calls')
        .select('id')
        .eq('retell_call_id', call.call_id)
        .single()

      if (callRow?.id) {
        const fullText = call.transcript_object
          .map((t) => `${t.role === 'agent' ? 'Sarah' : 'Caller'}: ${t.content}`)
          .join('\n')

        const { error: transcriptError } = await supabase
          .from('transcripts')
          .upsert(
            {
              call_id: callRow.id,
              business_id: businessId,
              turns: call.transcript_object as unknown as Json,
              full_text: fullText,
            },
            { onConflict: 'call_id' },
          )

        if (transcriptError) {
          console.error('[retell/webhook] transcript upsert error:', transcriptError)
        } else {
          console.log('[retell/webhook] transcript saved ✅')
        }
      }
    }
  }

  // ── call_analyzed ───────────────────────────────────────────
  if (event === 'call_analyzed') {
    const analysis = call.call_analysis

    const { error } = await supabase
      .from('calls')
      .update({
        summary: analysis?.call_summary ?? null,
        sentiment: normaliseSentiment(analysis?.user_sentiment),
        status: 'completed',
      })
      .eq('retell_call_id', call.call_id)

    if (error) {
      console.error('[retell/webhook] call_analyzed update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[retell/webhook] call_analyzed saved ✅')
  }

  return NextResponse.json({ received: true })
}
