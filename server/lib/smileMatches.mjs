// No Express-specific code here — shared by server/index.mjs (local dev and
// the Express production host) and api/smile-matches.js (Vercel). The pool is
// a Supabase table, so real anonymous travelers can meet across deployments.
// It stores only a selected creative signature and AI-generated world
// summaries—never camera frames, landmarks, names, accounts, or locations.

const matchShapes = ['Gentle Bloom', 'Bright Spark', 'Slow Sunrise']
const profileTtlMs = 7 * 24 * 60 * 60 * 1000
const tableName = 'joyd_match_profiles'

function isSafeSessionId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{12,80}$/.test(value)
}

function isSafeMatchRequest(value) {
  if (!value || typeof value !== 'object') return false
  if (!isSafeSessionId(value.clientSessionId)) {
    return false
  }
  const { signature, worlds } = value
  return signature && typeof signature === 'object'
    && matchShapes.includes(signature.shape)
    && Number.isInteger(signature.signalPercent)
    && signature.signalPercent >= 0
    && signature.signalPercent <= 100
    && Array.isArray(signature.colorTrail)
    && signature.colorTrail.length === 3
    && signature.colorTrail.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color))
    && Array.isArray(worlds)
    && worlds.length === 3
    && worlds.every(
      (world) => world && typeof world === 'object'
        && typeof world.worldName === 'string' && world.worldName.length > 0 && world.worldName.length <= 120
        && typeof world.quote === 'string' && world.quote.length > 0 && world.quote.length <= 420,
    )
}

function matchScore(first, second) {
  const shapeScore = first.shape === second.shape ? 1 : 0
  const signalScore = 1 - Math.min(Math.abs(first.signalPercent - second.signalPercent), 100) / 100
  const sharedColors = first.colorTrail.filter((color) => second.colorTrail.includes(color)).length / 3
  return shapeScore * 0.55 + signalScore * 0.35 + sharedColors * 0.1
}

function supabaseConfig() {
  // Accept either the project URL or a pasted Data API URL ending in /rest/v1.
  let url = process.env.SUPABASE_URL?.trim() ?? ''
  url = url.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Supabase matching request failed (${response.status}): ${detail.slice(0, 200)}`)
  }
  return response
}

function normalizeWorlds(worlds) {
  return worlds.map(({ worldName, quote }) => ({ worldName, quote }))
}

function validProfiles(value) {
  return Array.isArray(value)
    ? value.filter(
        (profile) =>
          profile
          && matchShapes.includes(profile.shape)
          && Number.isInteger(profile.signal_percent)
          && Array.isArray(profile.color_trail)
          && profile.color_trail.length === 3
          && Array.isArray(profile.worlds),
      )
    : []
}

export async function handleSmileMatchRequest(requestBody) {
  if (!isSafeMatchRequest(requestBody)) {
    return { status: 400, body: { code: 'INVALID_MATCH_SIGNATURE' } }
  }

  const config = supabaseConfig()
  if (!config) {
    return { status: 503, body: { code: 'MATCHING_NOT_CONFIGURED' } }
  }

  const { clientSessionId, signature, worlds } = requestBody
  const now = new Date()
  const currentTraveler = {
    shape: signature.shape,
    signalPercent: signature.signalPercent,
    colorTrail: signature.colorTrail,
    worlds: normalizeWorlds(worlds),
  }

  try {
    // Expired profiles are removed on matching requests. The database
    // integration can also run this same deletion as a scheduled job.
    await supabaseRequest(
      config,
      `${tableName}?expires_at=lt.${encodeURIComponent(now.toISOString())}`,
      { method: 'DELETE' },
    )

    const candidatesResponse = await supabaseRequest(
      config,
      `${tableName}?session_id=neq.${encodeURIComponent(clientSessionId)}&expires_at=gt.${encodeURIComponent(now.toISOString())}&select=shape,signal_percent,color_trail,worlds&order=created_at.desc&limit=48`,
    )
    const candidates = validProfiles(await candidatesResponse.json())

    await supabaseRequest(config, tableName, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        session_id: clientSessionId,
        shape: currentTraveler.shape,
        signal_percent: currentTraveler.signalPercent,
        color_trail: currentTraveler.colorTrail,
        worlds: currentTraveler.worlds,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + profileTtlMs).toISOString(),
      }),
    })

    if (!candidates.length) {
      return { status: 200, body: { matchSource: 'waiting' } }
    }

    const match = candidates.reduce((closest, candidate) => {
      const candidateScore = matchScore(currentTraveler, {
        shape: candidate.shape,
        signalPercent: candidate.signal_percent,
        colorTrail: candidate.color_trail,
      })
      return candidateScore > closest.score ? { profile: candidate, score: candidateScore } : closest
    }, {
      profile: candidates[0],
      score: matchScore(currentTraveler, {
        shape: candidates[0].shape,
        signalPercent: candidates[0].signal_percent,
        colorTrail: candidates[0].color_trail,
      }),
    }).profile

    const matchedTraveler = {
      shape: match.shape,
      signalPercent: match.signal_percent,
      colorTrail: match.color_trail,
    }

    return {
      status: 200,
      body: {
        matchSource: 'live',
        matchColorTrail: matchedTraveler.colorTrail,
        matchWorlds: normalizeWorlds(match.worlds),
        sharedShape: matchedTraveler.shape,
        similarity: Math.round(72 + matchScore(currentTraveler, matchedTraveler) * 26),
      },
    }
  } catch (error) {
    console.error('JOY:D matching request failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return { status: 503, body: { code: 'MATCHING_UNAVAILABLE' } }
  }
}

export async function handleSmileMatchDeletion(requestBody) {
  if (!requestBody || typeof requestBody !== 'object' || !isSafeSessionId(requestBody.clientSessionId)) {
    return { status: 400, body: { code: 'INVALID_MATCH_SIGNATURE' } }
  }
  const config = supabaseConfig()
  if (!config) {
    return { status: 503, body: { code: 'MATCHING_NOT_CONFIGURED' } }
  }

  try {
    await supabaseRequest(
      config,
      `${tableName}?session_id=eq.${encodeURIComponent(requestBody.clientSessionId)}`,
      { method: 'DELETE' },
    )
    return { status: 200, body: { deleted: true } }
  } catch (error) {
    console.error('JOY:D match profile deletion failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return { status: 503, body: { code: 'MATCHING_UNAVAILABLE' } }
  }
}
