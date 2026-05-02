import { createServer } from 'http'
import next from 'next'
import { WebSocketServer } from 'ws'
import { handleRetellConnection } from './lib/retell/llm-handler'

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app    = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  // WebSocket server — handles upgrades manually so we keep Next.js on the same port
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = req.url ?? ''

    if (url === '/api/retell/llm') {
      wss.handleUpgrade(req, socket as never, head, (ws) => {
        handleRetellConnection(ws)
      })
    } else {
      // Reject any other WebSocket upgrade attempt
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
    }
  })

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> Retell LLM WebSocket: ws://localhost:${port}/api/retell/llm`)
    console.log(`> Mode: ${dev ? 'development' : 'production'}`)
  })
})
