// Realtime mini-service for LeadPulse console.
// Emits events: conversation:new, message:received, message:sent,
// message:delivered, message:read, message:failed, campaign:started,
// campaign:paused, campaign:completed.
//
// Production architecture: webhook + worker endpoints publish to this service
// (via an internal HTTP endpoint) and frontend clients connect via the gateway.
//
// Run on port 3003. The gateway exposes this via /?XTransformPort=3003.

import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

const httpServer = createServer((req, res) => {
  // Internal publish endpoint
  if (req.method === 'POST' && req.url === '/emit') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      try {
        const { event, data } = JSON.parse(body || '{}')
        if (event) {
          io.emit(event, data || {})
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (e: any) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: e?.message || 'invalid' }))
      }
    })
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'leadpulse-realtime', port: PORT }))
})

const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[realtime] client connected: ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`[realtime] client disconnected: ${socket.id}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[realtime] LeadPulse socket.io service running on port ${PORT}`)
})
