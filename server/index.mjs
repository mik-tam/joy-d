import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleJoyCapsuleRequest } from './lib/joyCapsules.mjs'
import { handleJoySceneRequest } from './lib/joyScenes.mjs'
import { handleSmileMatchRequest } from './lib/smileMatches.mjs'

// This Express app is the local dev/preview server (proxied from Vite in
// `npm run dev`) and the standalone production host (`npm start`, e.g. on
// Render/Railway/Fly). The same three route handlers are also exposed as
// Vercel serverless functions in /api for a Vercel deployment — see
// server/lib/*.mjs, which both runtimes import from so behavior never drifts.

const app = express()
const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')
const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(serverDirectory, '../dist')

app.use(express.json({ limit: '16kb' }))

app.post('/api/joy-capsules', async (request, response) => {
  const { status, body } = await handleJoyCapsuleRequest(request.body)
  response.status(status).json(body)
})

app.post('/api/joy-scenes', async (request, response) => {
  const { status, body } = await handleJoySceneRequest(request.body)
  response.status(status).json(body)
})

app.post('/api/smile-matches', async (request, response) => {
  const { status, body } = await handleSmileMatchRequest(request.body)
  response.status(status).json(body)
})

app.use(express.static(distDirectory))

app.get('/{*path}', (_request, response) => {
  response.sendFile(path.join(distDirectory, 'index.html'))
})

app.listen(port, host, () => {
  console.log(`JOY:D server listening on http://${host}:${port}`)
})
