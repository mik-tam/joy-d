import { handleJoyNarrationRequest } from '../server/lib/joyNarration.mjs'

// Vercel Node.js Function.
export const config = { maxDuration: 45 }

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
    return
  }
  const { status, body } = await handleJoyNarrationRequest(request.body)
  response.status(status).json(body)
}
