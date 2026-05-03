import Anthropic from '@anthropic-ai/sdk'
import type WebSocket from 'ws'
import { buildSystemPrompt } from './system-prompt'
import { SARAH_TOOLS } from './tools'
import type {
  RetellIncomingMessage,
  RetellResponseChunk,
  RetellTranscriptTurn,
  CallState,
} from './types'
import type { BookAppointmentInput } from './tools'
import { createCalendarAppointment } from '@/lib/google/calendar'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Transcript → AI messages ─────────────────────────────────
function buildClaudeMessages(transcript: RetellTranscriptTurn[]): Anthropic.MessageParam[] {
  return transcript.map((turn) => ({
    role: turn.role === 'agent' ? 'assistant' : 'user',
    content: turn.content,
  }))
}

// ── Tool executor ─────────────────────────────────────────────
async function executeBookAppointment(
  input: BookAppointmentInput,
  state: CallState,
) {
  return createCalendarAppointment(
    input,
    state.businessId,
    state.callId || null,
    state.timezone,
  )
}

// ── Send a response chunk to Retell ──────────────────────────
function send(ws: WebSocket, chunk: RetellResponseChunk): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(chunk))
  }
}

// ── Core: handle response_required / reminder_required ───────
async function handleResponseRequired(
  ws: WebSocket,
  responseId: number,
  transcript: RetellTranscriptTurn[],
  state: CallState,
  abortSignal: AbortSignal,
): Promise<void> {
  const systemPrompt = buildSystemPrompt(
    state.businessName,
    state.ownerFirstName,
    state.serviceArea,
    state.timezone,
  )

  let messages: Anthropic.MessageParam[] = buildClaudeMessages(transcript)

  // Loop to handle tool calls (book_appointment may be called once per turn)
  for (let iteration = 0; iteration < 3; iteration++) {
    if (abortSignal.aborted) return

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: iteration === 0 ? SARAH_TOOLS : [], // no tools on continuation
    })

    // Stream text chunks to Retell as they arrive
    for await (const event of stream) {
      if (abortSignal.aborted) {
        stream.abort()
        return
      }

      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta' &&
        event.delta.text
      ) {
        send(ws, {
          response_type: 'response',
          response_id: responseId,
          content: event.delta.text,
          content_complete: false,
        })
      }
    }

    const finalMessage = await stream.finalMessage()

    if (finalMessage.stop_reason === 'tool_use') {
      const toolUseBlock = finalMessage.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      if (!toolUseBlock || toolUseBlock.name !== 'book_appointment') break

      const toolResult = await executeBookAppointment(
        toolUseBlock.input as BookAppointmentInput,
        state,
      )

      // Append assistant message + tool result and loop for Claude's spoken response
      messages = [
        ...messages,
        { role: 'assistant', content: finalMessage.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUseBlock.id,
              content: JSON.stringify(toolResult),
            },
          ],
        },
      ]
      continue
    }

    // end_turn or max_tokens — we're done
    break
  }

  if (!abortSignal.aborted) {
    send(ws, {
      response_type: 'response',
      response_id: responseId,
      content: '',
      content_complete: true,
    })
  }
}

// ── Main connection handler ───────────────────────────────────
export function handleRetellConnection(ws: WebSocket): void {
  const state: CallState = {
    callId: '',
    businessId: '',
    businessName: 'the HVAC company',
    ownerFirstName: 'the owner',
    serviceArea: 'your area',
    timezone: 'America/Chicago',
    currentAbortController: null,
  }

  ws.on('message', async (raw: Buffer) => {
    let message: RetellIncomingMessage

    try {
      message = JSON.parse(raw.toString()) as RetellIncomingMessage
    } catch {
      console.error('[retell] Failed to parse message:', raw.toString())
      return
    }

    if (message.interaction_type === 'call_details') {
      const vars = message.call.retell_llm_dynamic_variables ?? {}
      state.callId      = message.call.call_id
      state.businessId  = (vars.business_id as string) ?? ''
      state.businessName = (vars.business_name as string) ?? 'the HVAC company'
      state.ownerFirstName = (vars.owner_first_name as string) ?? 'the owner'
      state.serviceArea = (vars.service_area as string) ?? 'your area'
      state.timezone    = (vars.timezone as string) ?? 'America/Chicago'

      console.log(`[retell] Call started: ${state.callId} | business: ${state.businessName}`)
      return
    }

    if (
      message.interaction_type === 'response_required' ||
      message.interaction_type === 'reminder_required'
    ) {
      // Cancel any in-flight response (caller interrupted the agent)
      if (state.currentAbortController) {
        state.currentAbortController.abort()
      }

      const abortController = new AbortController()
      state.currentAbortController = abortController

      const { response_id, transcript } = message

      // reminder_required = caller went silent; add a gentle prompt
      const effectiveTranscript =
        message.interaction_type === 'reminder_required'
          ? [
              ...transcript,
              {
                role: 'user' as const,
                content: '[The caller has been silent. Gently re-engage with a brief, natural prompt.]',
              },
            ]
          : transcript

      handleResponseRequired(ws, response_id, effectiveTranscript, state, abortController.signal)
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.error('[retell] LLM handler error:', err)
          }
        })
        .finally(() => {
          if (state.currentAbortController === abortController) {
            state.currentAbortController = null
          }
        })
    }
  })

  ws.on('close', (code, reason) => {
    if (state.currentAbortController) {
      state.currentAbortController.abort()
    }
    console.log(`[retell] Call ended: ${state.callId} | code: ${code}`)
  })

  ws.on('error', (err) => {
    console.error(`[retell] WebSocket error on call ${state.callId}:`, err.message)
  })
}
