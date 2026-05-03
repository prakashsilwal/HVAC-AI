#!/usr/bin/env tsx
/**
 * Tests the Retell LLM WebSocket endpoint locally.
 * Run with: npx tsx scripts/test-websocket.ts
 * Make sure `npm run dev` is running in another terminal first.
 */

import WebSocket from 'ws'

const WS_URL = 'ws://localhost:3000/api/retell/llm'

const MOCK_CALL_DETAILS = {
  interaction_type: 'call_details',
  call: {
    call_id: 'test_call_001',
    agent_id: 'test_agent',
    call_status: 'registered',
    metadata: {},
    retell_llm_dynamic_variables: {
      business_id: 'test-business-uuid',
      business_name: 'Apex HVAC Services',
      owner_first_name: 'Mike',
      service_area: 'Charlotte, NC',
      timezone: 'America/New_York',
    },
  },
}

const MOCK_TURNS = [
  {
    interaction_type: 'response_required',
    response_id: 1,
    call: MOCK_CALL_DETAILS.call,
    transcript: [
      { role: 'user', content: "Hi, my AC stopped working and it's really hot in here." },
    ],
  },
  {
    interaction_type: 'response_required',
    response_id: 2,
    call: MOCK_CALL_DETAILS.call,
    transcript: [
      { role: 'user', content: "Hi, my AC stopped working and it's really hot in here." },
      { role: 'agent', content: "Oh no, I'm sorry to hear that! Can you tell me a bit more about what's happening — is the unit not turning on at all, or is it running but not cooling?" },
      { role: 'user', content: "It's running but blowing warm air. It's 95 degrees outside." },
    ],
  },
]

async function runTest() {
  console.log(`\nConnecting to ${WS_URL}...\n`)

  const ws = new WebSocket(WS_URL)

  let responseId = 0
  let fullResponse = ''
  let turnIndex = 0

  ws.on('open', () => {
    console.log('✅ Connected\n')
    console.log('→ Sending call_details...')
    ws.send(JSON.stringify(MOCK_CALL_DETAILS))

    setTimeout(() => {
      if (turnIndex < MOCK_TURNS.length) {
        const turn = MOCK_TURNS[turnIndex++]
        responseId = turn.response_id
        console.log(`\n→ Turn ${responseId}: "${(turn.transcript.at(-1) as { content: string }).content}"\n`)
        ws.send(JSON.stringify(turn))
      }
    }, 200)
  })

  ws.on('message', (data: Buffer) => {
    const msg = JSON.parse(data.toString())

    if (msg.response_type === 'response') {
      if (!msg.content_complete) {
        process.stdout.write(msg.content)
        fullResponse += msg.content
      } else {
        console.log('\n')
        console.log(`✅ Turn ${msg.response_id} complete (${fullResponse.length} chars)\n`)
        fullResponse = ''

        if (turnIndex < MOCK_TURNS.length) {
          setTimeout(() => {
            const turn = MOCK_TURNS[turnIndex++]
            responseId = turn.response_id
            console.log(`→ Turn ${responseId}: "${(turn.transcript.at(-1) as { content: string }).content}"\n`)
            ws.send(JSON.stringify(turn))
          }, 500)
        } else {
          console.log('✅ All turns complete. Closing.\n')
          ws.close()
        }
      }
    }
  })

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message)
    console.error('   Make sure `npm run dev` is running on port 3000')
    process.exit(1)
  })

  ws.on('close', () => {
    console.log('Connection closed.')
    process.exit(0)
  })
}

runTest()
