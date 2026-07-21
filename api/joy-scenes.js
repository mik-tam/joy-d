import { handleJoySceneRequest } from '../server/lib/joyScenes.mjs'

// Vercel Node.js Function. Longer budget: this route generates up to 5
// images (1 backdrop + up to 4 sprites) in parallel behind a 90s internal
// abort, so the function itself needs headroom beyond that.
export const config = { maxDuration: 120 }

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
    return
  }
  const { status, body } = await handleJoySceneRequest(request.body)
  response.status(status).json(body)
}
