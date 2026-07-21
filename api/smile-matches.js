import { handleSmileMatchRequest } from '../server/lib/smileMatches.mjs'

export default function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
    return
  }
  const { status, body } = handleSmileMatchRequest(request.body)
  response.status(status).json(body)
}
