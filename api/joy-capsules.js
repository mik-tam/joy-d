import { handleJoyCapsuleRequest } from '../server/lib/joyCapsules.mjs'

// Vercel Node.js Function. Vercel's runtime already parses a JSON request
// body into `request.body`, the same shape express.json() gives the local
// Express server, so handleJoyCapsuleRequest needs no adaptation.
export const config = { maxDuration: 90 }

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
    return
  }
  const { status, body } = await handleJoyCapsuleRequest(request.body)
  response.status(status).json(body)
}
