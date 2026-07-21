// No Express-specific code here — shared by server/index.mjs (local dev and
// the Express production host) and api/smile-matches.js (Vercel). The pool is
// a Supabase table, so real anonymous travelers can meet across deployments.
// It stores only a selected creative signature and AI-generated world
// summaries—never camera frames, landmarks, names, accounts, or locations.

const matchShapes = ['Gentle Bloom', 'Bright Spark', 'Slow Sunrise']
const sceneSprites = ['lantern-boat', 'crescent-moon', 'garden-door', 'cloud', 'wave', 'star']
const profileTtlMs = 7 * 24 * 60 * 60 * 1000
const tableName = 'joyd_match_profiles'

function isSafeSessionId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{12,80}$/.test(value)
}

function isSafeWorld(world) {
  return world && typeof world === 'object'
    && typeof world.worldName === 'string' && world.worldName.length > 0 && world.worldName.length <= 120
    && typeof world.quote === 'string' && world.quote.length > 0 && world.quote.length <= 420
    && (world.sprite == null || sceneSprites.includes(world.sprite))
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
    && Number.isInteger(signature.heldForMs)
    && signature.heldForMs >= 0
    && signature.heldForMs <= 8000
    && typeof signature.riseRate === 'number'
    && signature.riseRate >= 0
    && signature.riseRate <= 3
    && typeof signature.momentCode === 'string'
    && /^JOY-[A-Z0-9]{3,8}$/.test(signature.momentCode)
    && typeof signature.wonderTitle === 'string'
    && signature.wonderTitle.length > 0
    && signature.wonderTitle.length <= 80
    && Array.isArray(signature.colorTrail)
    && signature.colorTrail.length === 3
    && signature.colorTrail.every((color) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color))
    && Array.isArray(worlds)
    && worlds.length === 3
    && worlds.every(isSafeWorld)
}

// Weighs every trait shown on the traveler card (brightness, hold, bloom)
// plus color trail overlap, so the displayed percentage actually tracks how
// similar the two cards look rather than mostly reflecting shape alone.
function matchScore(first, second) {
  const shapeScore = first.shape === second.shape ? 1 : 0
  const signalScore = 1 - Math.min(Math.abs(first.signalPercent - second.signalPercent), 100) / 100
  const holdScore = 1 - Math.min(Math.abs(first.heldForMs - second.heldForMs), 4000) / 4000
  const bloomScore = 1 - Math.min(Math.abs(first.riseRate - second.riseRate), 1) / 1
  const sharedColors = first.colorTrail.filter((color) => second.colorTrail.includes(color)).length / 3
  return shapeScore * 0.35 + signalScore * 0.25 + holdScore * 0.15 + bloomScore * 0.15 + sharedColors * 0.1
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
  return worlds.map(({ worldName, quote, sprite }) => ({
    worldName,
    quote,
    ...(sceneSprites.includes(sprite) ? { sprite } : {}),
  }))
}

function profileToTraveler(profile) {
  return {
    shape: profile.shape,
    signalPercent: profile.signal_percent,
    colorTrail: profile.color_trail,
    heldForMs: Number.isInteger(profile.held_for_ms) ? profile.held_for_ms : 700,
    riseRate: typeof profile.rise_rate === 'number' ? profile.rise_rate : 0.35,
    momentCode: typeof profile.moment_code === 'string' && profile.moment_code.startsWith('JOY-')
      ? profile.moment_code
      : `JOY-${String(profile.signal_percent ?? 0).padStart(2, '0')}X`,
    wonderTitle: typeof profile.wonder_title === 'string' && profile.wonder_title
      ? profile.wonder_title
      : 'A fellow traveler',
    worlds: normalizeWorlds(Array.isArray(profile.worlds) ? profile.worlds : []),
  }
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
    heldForMs: signature.heldForMs,
    riseRate: signature.riseRate,
    momentCode: signature.momentCode,
    wonderTitle: signature.wonderTitle,
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
      `${tableName}?session_id=neq.${encodeURIComponent(clientSessionId)}&expires_at=gt.${encodeURIComponent(now.toISOString())}&select=shape,signal_percent,color_trail,worlds,moment_code,wonder_title,held_for_ms,rise_rate&order=created_at.desc&limit=48`,
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
        moment_code: currentTraveler.momentCode,
        wonder_title: currentTraveler.wonderTitle,
        held_for_ms: currentTraveler.heldForMs,
        rise_rate: currentTraveler.riseRate,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + profileTtlMs).toISOString(),
      }),
    })

    if (!candidates.length) {
      return { status: 200, body: { matchSource: 'waiting' } }
    }

    const candidateTraveler = (candidate) => ({
      shape: candidate.shape,
      signalPercent: candidate.signal_percent,
      colorTrail: candidate.color_trail,
      heldForMs: Number.isInteger(candidate.held_for_ms) ? candidate.held_for_ms : 700,
      riseRate: typeof candidate.rise_rate === 'number' ? candidate.rise_rate : 0.35,
    })

    const match = candidates.reduce((closest, candidate) => {
      const candidateScore = matchScore(currentTraveler, candidateTraveler(candidate))
      return candidateScore > closest.score ? { profile: candidate, score: candidateScore } : closest
    }, {
      profile: candidates[0],
      score: matchScore(currentTraveler, candidateTraveler(candidates[0])),
    }).profile

    const matchedTraveler = profileToTraveler(match)

    return {
      status: 200,
      body: {
        matchSource: 'live',
        matchColorTrail: matchedTraveler.colorTrail,
        matchWorlds: matchedTraveler.worlds,
        matchSignature: {
          colorTrail: matchedTraveler.colorTrail,
          heldForMs: matchedTraveler.heldForMs,
          momentCode: matchedTraveler.momentCode,
          riseRate: matchedTraveler.riseRate,
          shape: matchedTraveler.shape,
          signalPercent: matchedTraveler.signalPercent,
          wonderTitle: matchedTraveler.wonderTitle,
        },
        sharedShape: matchedTraveler.shape,
        // The true weighted similarity, 0-100 — no artificial floor. A
        // previous version always reported 72-98%, so even a poor match
        // read as a strong one; this now tracks what the traveler card
        // actually shows (brightness, hold, bloom, shape, color trail).
        similarity: Math.round(matchScore(currentTraveler, matchedTraveler) * 100),
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
