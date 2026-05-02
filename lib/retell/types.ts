// ── Retell → Your server ─────────────────────────────────────
export type RetellTranscriptTurn = {
  role: 'agent' | 'user'
  content: string
}

export type RetellCallDetails = {
  call_id: string
  agent_id: string
  call_status: string
  metadata: Record<string, unknown>
  retell_llm_dynamic_variables?: {
    business_id?: string
    business_name?: string
    owner_first_name?: string
    service_area?: string
    timezone?: string
    [key: string]: unknown
  }
}

export type RetellIncomingMessage =
  | {
      interaction_type: 'call_details'
      call: RetellCallDetails
    }
  | {
      interaction_type: 'response_required' | 'reminder_required'
      response_id: number
      transcript: RetellTranscriptTurn[]
      call: RetellCallDetails
    }

// ── Your server → Retell ─────────────────────────────────────
export type RetellResponseChunk = {
  response_type: 'response'
  response_id: number
  content: string
  content_complete: boolean
  end_call?: boolean
  disconnect_reason?: string
}

// ── Per-connection state ──────────────────────────────────────
export type CallState = {
  callId: string
  businessId: string
  businessName: string
  ownerFirstName: string
  serviceArea: string
  timezone: string
  currentAbortController: AbortController | null
}
