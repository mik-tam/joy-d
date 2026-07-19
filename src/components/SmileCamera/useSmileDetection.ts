import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState, type RefObject } from 'react'

const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const SMILE_THRESHOLD = 0.45
const REQUIRED_SMILE_MS = 500
const INFERENCE_INTERVAL_MS = 110

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
}

type SmileDetection = {
  error: string | null
  smileScore: number
  status: SmileDetectionStatus
}

export function useSmileDetection({
  enabled,
  videoRef,
  onSmileDetected,
}: UseSmileDetectionOptions): SmileDetection {
  const [status, setStatus] = useState<SmileDetectionStatus>('idle')
  const [smileScore, setSmileScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const onSmileDetectedRef = useRef(onSmileDetected)

  useEffect(() => {
    onSmileDetectedRef.current = onSmileDetected
  }, [onSmileDetected])

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setSmileScore(0)
      setError(null)
      return
    }

    let active = true
    let animationFrame = 0
    let landmarker: FaceLandmarker | null = null
    let lastInferenceAt = 0
    let lastVideoTime = -1
    let smoothedScore = 0
    let smileStartedAt: number | null = null
    let peakScore = 0
    let triggered = false

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
              smileStartedAt = null
              peakScore = 0
              smoothedScore = 0
              setSmileScore(0)
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

              if (smoothedScore >= SMILE_THRESHOLD) {
                smileStartedAt ??= now
                peakScore = Math.max(peakScore, smoothedScore)
                setStatus('smiling')

                if (!triggered && now - smileStartedAt >= REQUIRED_SMILE_MS) {
                  triggered = true
                  const heldForMs = now - smileStartedAt
                  onSmileDetectedRef.current({
                    heldForMs,
                    peakSignal: peakScore,
                    riseRate: (peakScore - SMILE_THRESHOLD) / (heldForMs / 1000),
                  })
                }
              } else {
                smileStartedAt = null
                peakScore = 0
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

  return { error, smileScore, status }
}
