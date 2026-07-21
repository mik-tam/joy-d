import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState, type RefObject } from 'react'

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const SMILE_THRESHOLD = 0.45
const SMILE_RELEASE_THRESHOLD = 0.36
const REQUIRED_SMILE_MS = 500
const INFERENCE_INTERVAL_MS = 110
const MAX_HOLD_MS = 8000

export type SmileDetectionStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no-face'
  | 'smiling'
  | 'unavailable'

export type SmileMoment = {
  heldForMs: number
  peakSignal: number
  riseRate: number
}

type UseSmileDetectionOptions = {
  enabled: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  onSmileDetected: (moment: SmileMoment) => void
  onSmileMomentChange?: (moment: SmileMoment) => void
}

type SmileDetection = {
  error: string | null
  smileScore: number
  status: SmileDetectionStatus
  wowScore: number
}

function buildMoment(
  now: number,
  smileStartedAt: number,
  peakScore: number,
  startScore: number,
  peakReachedAt: number,
): SmileMoment {
  const heldForMs = Math.min(Math.max(now - smileStartedAt, 0), MAX_HOLD_MS)
  const riseMs = Math.max(peakReachedAt - smileStartedAt, 80)
  const riseRate = Math.max(0, (peakScore - startScore) / (riseMs / 1000))
  return {
    heldForMs,
    peakSignal: peakScore,
    riseRate,
  }
}

export function useSmileDetection({
  enabled,
  videoRef,
  onSmileDetected,
  onSmileMomentChange,
}: UseSmileDetectionOptions): SmileDetection {
  const [status, setStatus] = useState<SmileDetectionStatus>('idle')
  const [smileScore, setSmileScore] = useState(0)
  const [wowScore, setWowScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const onSmileDetectedRef = useRef(onSmileDetected)
  const onSmileMomentChangeRef = useRef(onSmileMomentChange)

  useEffect(() => {
    onSmileDetectedRef.current = onSmileDetected
  }, [onSmileDetected])

  useEffect(() => {
    onSmileMomentChangeRef.current = onSmileMomentChange
  }, [onSmileMomentChange])

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setSmileScore(0)
      setWowScore(0)
      setError(null)
      return
    }

    let active = true
    let animationFrame = 0
    let landmarker: FaceLandmarker | null = null
    let lastInferenceAt = 0
    let lastVideoTime = -1
    let smoothedScore = 0
    let smoothedWow = 0
    let smileStartedAt: number | null = null
    let smileStartScore = SMILE_THRESHOLD
    let peakScore = 0
    let peakReachedAt = 0
    let unlocked = false
    // Freeze signature metrics once the unlocking smile ends, so a later
    // "step through" smile does not rewrite HOLD / BLOOM / BRIGHTNESS.
    let metricsFrozen = false
    let lastEmittedHoldBucket = -1

    const emitLiveMoment = (now: number, force = false) => {
      if (metricsFrozen || smileStartedAt === null) return
      const moment = buildMoment(now, smileStartedAt, peakScore, smileStartScore, peakReachedAt || smileStartedAt)
      const holdBucket = Math.round(moment.heldForMs / 100)
      if (!force && holdBucket === lastEmittedHoldBucket) return
      lastEmittedHoldBucket = holdBucket
      onSmileMomentChangeRef.current?.(moment)
    }

    const start = async () => {
      setStatus('loading')
      setError(null)

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
        const createdLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.6,
          minFacePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        })

        if (!active) {
          createdLandmarker.close()
          return
        }

        landmarker = createdLandmarker
        setStatus('ready')

        const detect = (now: number) => {
          if (!active || !landmarker) return

          const video = videoRef.current
          const canInfer =
            video &&
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.currentTime !== lastVideoTime &&
            now - lastInferenceAt >= INFERENCE_INTERVAL_MS

          if (canInfer) {
            lastInferenceAt = now
            lastVideoTime = video.currentTime
            const result = landmarker.detectForVideo(video, now)
            const categories = result.faceBlendshapes[0]?.categories

            if (!categories) {
              if (unlocked && smileStartedAt !== null && !metricsFrozen) {
                emitLiveMoment(now, true)
                metricsFrozen = true
              }
              smileStartedAt = null
              smileStartScore = SMILE_THRESHOLD
              peakScore = 0
              peakReachedAt = 0
              smoothedScore = 0
              smoothedWow = 0
              setSmileScore(0)
              setWowScore(0)
              setStatus('no-face')
            } else {
              const left = categories.find(
                (category) => category.categoryName === 'mouthSmileLeft',
              )?.score ?? 0
              const right = categories.find(
                (category) => category.categoryName === 'mouthSmileRight',
              )?.score ?? 0
              const rawScore = (left + right) / 2
              smoothedScore = smoothedScore * 0.65 + rawScore * 0.35
              setSmileScore(smoothedScore)

              // A "WOW" is an open, O-shaped mouth: jaw dropped with lips
              // funneled. Used to reveal hidden wonders inside the worlds.
              const jawOpen = categories.find(
                (category) => category.categoryName === 'jawOpen',
              )?.score ?? 0
              const funnel = categories.find(
                (category) => category.categoryName === 'mouthFunnel',
              )?.score ?? 0
              const rawWow = jawOpen * 0.65 + funnel * 0.35
              smoothedWow = smoothedWow * 0.6 + rawWow * 0.4
              setWowScore(smoothedWow)

              const holding =
                smoothedScore >= (unlocked ? SMILE_RELEASE_THRESHOLD : SMILE_THRESHOLD)

              if (holding) {
                if (smileStartedAt === null) {
                  smileStartedAt = now
                  smileStartScore = smoothedScore
                  peakScore = smoothedScore
                  peakReachedAt = now
                  lastEmittedHoldBucket = -1
                }

                if (smoothedScore > peakScore) {
                  peakScore = smoothedScore
                  peakReachedAt = now
                }

                setStatus('smiling')

                if (!unlocked && now - smileStartedAt >= REQUIRED_SMILE_MS) {
                  unlocked = true
                  const moment = buildMoment(now, smileStartedAt, peakScore, smileStartScore, peakReachedAt)
                  onSmileDetectedRef.current(moment)
                  lastEmittedHoldBucket = Math.round(moment.heldForMs / 100)
                } else if (unlocked && !metricsFrozen) {
                  emitLiveMoment(now)
                }
              } else {
                if (unlocked && smileStartedAt !== null && !metricsFrozen) {
                  emitLiveMoment(now, true)
                  metricsFrozen = true
                }
                smileStartedAt = null
                smileStartScore = SMILE_THRESHOLD
                peakScore = 0
                peakReachedAt = 0
                setStatus('ready')
              }
            }
          }

          animationFrame = requestAnimationFrame(detect)
        }

        animationFrame = requestAnimationFrame(detect)
      } catch (caughtError) {
        if (!active) return
        setStatus('unavailable')
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'The smile signal could not start.',
        )
      }
    }

    void start()

    return () => {
      active = false
      cancelAnimationFrame(animationFrame)
      landmarker?.close()
    }
  }, [enabled, videoRef])

  return { error, smileScore, status, wowScore }
}
