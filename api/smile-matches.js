import { handleSmileMatchRequest } from '../server/lib/smileMatches.mjs'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
    return
  }
  const { status, body } = await handleSmileMatchRequest(request.body)
  response.status(status).json(body)
}
