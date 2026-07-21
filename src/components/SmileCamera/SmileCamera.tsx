import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Camera, RefreshCw, Sparkles } from 'lucide-react'
import { JoyPrint } from '../JoyPrint'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSmileDetection } from './useSmileDetection'
import { createJoySignature, bloomLabel, type JoySignature } from './createJoySignature'
import { PortalReveal } from '../Portal/PortalReveal'
import { playPortalChime, setJoySoundsEnabled } from '../../data/joySounds'

type CameraState = 'idle' | 'requesting' | 'preview' | 'denied' | 'unsupported'

type SmileCameraProps = {
  onBack: () => void
}

export function SmileCamera({ onBack }: SmileCameraProps) {
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const requestVersionRef = useRef(0)
  const [smileUnlocked, setSmileUnlocked] = useState(false)
  const [joySignature, setJoySignature] = useState<JoySignature | null>(null)
  const [portalOpen, setPortalOpen] = useState(false)
  const [celebrationComplete, setCelebrationComplete] = useState(false)
  const [entering, setEntering] = useState(false)
  const smileScoreRef = useRef(0)
  const enterHoldRef = useRef<number | null>(null)
  const enterReleaseRef = useRef(false)
  const reduceMotion = useReducedMotion()
  const handleSmileDetected = useCallback((moment: Parameters<typeof createJoySignature>[0]) => {
    setJoySignature(createJoySignature(moment))
    setCelebrationComplete(false)
    setSmileUnlocked(true)
    // The unlocking smile must be released before a fresh smile can carry
    // the traveler through the door.
    enterReleaseRef.current = true
  }, [])
  const handleSmileMomentChange = useCallback((moment: Parameters<typeof createJoySignature>[0]) => {
    setJoySignature((current) => {
      if (!current) return createJoySignature(moment)
      const next = createJoySignature(moment)
      // Keep the print identity stable once unlocked; only refresh the live
      // measurements drawn from this continuing smile.
      return {
        ...current,
        heldForMs: next.heldForMs,
        riseRate: next.riseRate,
        shape: next.shape,
        signalPercent: next.signalPercent,
      }
    })
  }, [])
  const { error: smileError, smileScore, status: smileStatus, wowScore } = useSmileDetection({
    enabled: cameraState === 'preview',
    videoRef,
    onSmileDetected: handleSmileDetected,
    onSmileMomentChange: handleSmileMomentChange,
  })
  const smileMeterPercent = Math.min(Math.round((smileScore / 0.45) * 100), 100)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const openPortal = () => {
    if (!smileUnlocked || !joySignature) return
    // The camera stays on inside the portal: the live smile keeps lighting
    // the worlds and charging the next door. Frames never leave the browser.
    setJoySoundsEnabled(true)
    playPortalChime()
    setPortalOpen(true)
  }

  const beginEntering = useCallback(() => {
    if (entering || !smileUnlocked || !joySignature) return
    setEntering(true)
  }, [entering, joySignature, smileUnlocked])

  const returnToSmile = () => {
    setPortalOpen(false)
    setEntering(false)
    stopCamera()
    setSmileUnlocked(false)
    setJoySignature(null)
    setCelebrationComplete(false)
    setCameraState('idle')
  }

  const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      return
    }

    const requestVersion = ++requestVersionRef.current
    stopCamera()
    setSmileUnlocked(false)
    setJoySignature(null)
    setPortalOpen(false)
    setCelebrationComplete(false)
    setCameraState('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      if (requestVersion !== requestVersionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      setCameraState('preview')
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      stopCamera()
      const name = error instanceof DOMException ? error.name : ''
      setCameraState(
        name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'unsupported'
          : 'denied',
      )
    }
  }

  const handleBack = () => {
    requestVersionRef.current += 1
    stopCamera()
    onBack()
  }

  useEffect(
    () => () => {
      requestVersionRef.current += 1
      stopCamera()
    },
    [],
  )

  useEffect(() => {
    if (cameraState !== 'preview' || !videoRef.current || !streamRef.current) {
      return
    }

    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play().catch(() => undefined)
  }, [cameraState])

  useEffect(() => {
    if (!smileUnlocked) return
    if (reduceMotion) {
      setCelebrationComplete(true)
      return
    }
    const timer = setTimeout(() => setCelebrationComplete(true), 2800)
    return () => clearTimeout(timer)
  }, [reduceMotion, smileUnlocked])

  useEffect(() => {
    smileScoreRef.current = smileScore
  }, [smileScore])

  // Once unlocked, a fresh held smile carries the traveler through the door.
  useEffect(() => {
    if (cameraState !== 'preview' || !smileUnlocked || portalOpen || entering) return
    const tick = setInterval(() => {
      const score = smileScoreRef.current
      if (score < 0.36) enterReleaseRef.current = false
      if (enterReleaseRef.current) return
      if (score >= 0.45) {
        enterHoldRef.current ??= performance.now()
        if (performance.now() - enterHoldRef.current >= 700) {
          enterHoldRef.current = null
          beginEntering()
        }
      } else {
        enterHoldRef.current = null
      }
    }, 120)
    return () => clearInterval(tick)
  }, [beginEntering, cameraState, entering, portalOpen, smileUnlocked])

  // The sparkle burst plays, the doorway swallows the screen, then the
  // portal void takes over.
  useEffect(() => {
    if (!entering) return
    const timer = setTimeout(() => openPortal(), reduceMotion ? 250 : 950)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entering, reduceMotion])

  const statusCaption = {
    idle: 'Waking the smile signal…',
    loading: 'Learning the shape of a smile…',
    ready: 'A gentle smile opens the door',
    'no-face': 'Step into the little window',
    smiling: 'Keep smiling — it’s opening',
    unavailable: 'The smile signal needs a moment',
  }[smileStatus]

  return (
    <main className="relative isolate h-dvh max-h-dvh overflow-hidden overscroll-none bg-[#1c1136]">
      <motion.div
        animate={
          entering
            ? reduceMotion
              ? { opacity: 0 }
              : { scale: 6, opacity: 0 }
            : { scale: 1, opacity: 1 }
        }
        transition={entering ? { duration: reduceMotion ? 0.3 : 1.15, ease: [0.55, 0, 0.85, 0.35] } : { duration: 0 }}
        style={{ transformOrigin: '50% 46%' }}
        className={`absolute inset-0 flex flex-col items-center px-5 sm:px-6 ${
          smileUnlocked
            ? 'justify-start overflow-y-auto overscroll-none py-14 pb-6 sm:justify-center sm:overflow-hidden sm:py-10'
            : 'justify-center overflow-hidden overscroll-none'
        }`}
      >
      {/* The doorway from the landing page, drawn close: the glowing arch and
          its stairs sit at the very center of the screen. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,#5c3a5e_0%,#31204f_45%,#17102f_100%)]" />
        <img
          src="/art/portal-garden.png"
          alt=""
          className="absolute left-1/2 top-1/2 w-[max(175vw,175vh)] max-w-none -translate-x-[66.6%] -translate-y-[49%] opacity-40"
        />
        <div className="absolute inset-0 bg-[#160a31]/45" />
        <motion.div
          animate={reduceMotion ? undefined : { opacity: [0.55, 0.8, 0.55] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,219,146,0.34)_0%,rgba(255,190,130,0.14)_45%,transparent_68%)] blur-xl"
        />
        <div className="joy-paper-grain absolute inset-0" />
      </div>

      <button
        type="button"
        onClick={handleBack}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#160a31]/60 px-3 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to the doorway
      </button>

      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative z-10 flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.28em] text-amber-100/85 sm:text-xs ${
          smileUnlocked ? 'mb-3 sm:mb-6' : 'mb-6'
        }`}
      >
        <Sparkles className="size-4" aria-hidden="true" />
        THE FIRST LITTLE DOOR
      </motion.p>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={`relative z-10 flex w-full max-w-[22rem] flex-col items-center ${smileUnlocked ? 'origin-top scale-[0.78] sm:scale-95' : ''}`}
      >
        {/* The celebration bursts out from behind the doorway itself. */}
        {cameraState === 'preview' && smileUnlocked && !celebrationComplete && !reduceMotion && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-0" aria-hidden="true">
            <UnlockBubbles />
          </div>
        )}
        <ArchWindow glowing={smileUnlocked}>
          {cameraState === 'idle' && (
            <button
              type="button"
              onClick={() => void requestCamera()}
              aria-label="Open my portal"
              className="group absolute inset-0 focus:outline-none"
            >
              <div
                className="absolute inset-0 opacity-95 transition group-hover:opacity-100"
                style={{
                  backgroundImage: 'url(/art/portal-garden.png)',
                  backgroundSize: '880% auto',
                  backgroundPosition: '69% 51%',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2b1a4a]/45 via-transparent to-[#2b1a4a]/20 transition group-hover:from-[#2b1a4a]/25" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition group-hover:scale-105">
                <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-rose-300 to-fuchsia-400 text-purple-950 shadow-lg shadow-rose-950/30">
                  <Camera className="size-6" aria-hidden="true" />
                </div>
                <span className="font-serif text-xl font-black leading-tight text-[#6b3a10] drop-shadow-[0_1px_0_rgba(255,247,214,0.85)]">
                  Open my portal
                </span>
              </div>
            </button>
          )}

          {cameraState === 'requesting' && (
            <div className="absolute inset-0 grid place-items-center bg-[#241442]/70">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                className="size-16 rounded-full border-2 border-amber-100/25 border-t-amber-100"
              />
            </div>
          )}

          {cameraState === 'preview' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                aria-label="Live camera preview"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-[#160a31]/85 via-[#160a31]/35 to-transparent" />
              {/* The smile meter lives on the window itself: bright light
                  rises from the doorstep as the smile grows. */}
              {!smileUnlocked && smileStatus !== 'unavailable' && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-200"
                  style={{ height: `${smileMeterPercent}%` }}
                >
                  <div className="absolute inset-x-4 top-0 h-1 rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200 shadow-[0_0_16px_4px_rgba(253,186,150,0.7)]" />
                  <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[calc(100%+0.55rem)] rounded-full border border-amber-100/35 bg-[#241040]/85 px-3 py-1 text-xs font-black tabular-nums tracking-[0.12em] text-amber-50 shadow-[0_2px_12px_rgba(20,8,42,0.55)] backdrop-blur">
                    {smileMeterPercent}%
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-200/80 via-rose-300/55 to-fuchsia-300/30" />
                </div>
              )}
              {smileUnlocked && (
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber-200/80 via-rose-300/45 to-fuchsia-300/30 transition-opacity duration-300"
                  style={{ opacity: 0.3 + Math.min(smileScore, 1) * 0.65 }}
                />
              )}
              <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-purple-950/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                <span className="size-1.5 rounded-full bg-rose-300 shadow-[0_0_10px_2px_rgba(253,164,175,0.6)]" />
                LIVE
              </div>
              {smileUnlocked ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 text-center">
                  <p className="text-sm font-black tracking-wide text-white drop-shadow-[0_1px_8px_rgba(20,8,42,1)]">
                    The first door is unlocked!
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-amber-100/90 drop-shadow-[0_1px_6px_rgba(20,8,42,1)]">
                    step through with a smile
                  </p>
                </div>
              ) : (
                <p className="pointer-events-none absolute inset-x-0 bottom-3.5 z-10 px-4 text-center text-xs font-bold tracking-wide text-white drop-shadow-[0_1px_8px_rgba(20,8,42,1)]">
                  {statusCaption}
                </p>
              )}
              {smileUnlocked && (
                <button
                  type="button"
                  onClick={beginEntering}
                  aria-label="Enter your first JOY:D world"
                  className="absolute inset-0 z-20 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-100/70"
                />
              )}
            </>
          )}

          {cameraState === 'denied' && (
            <div className="absolute inset-0 grid place-items-center bg-[#241442]/80 p-6 text-center">
              <div>
                <span className="text-5xl">☁️</span>
                <p className="mt-3 text-sm leading-relaxed text-white/75">The window stayed closed. JOY:D needs camera permission to begin.</p>
              </div>
            </div>
          )}

          {cameraState === 'unsupported' && (
            <div className="absolute inset-0 grid place-items-center bg-[#241442]/80 p-6 text-center">
              <div>
                <span className="text-5xl">🔮</span>
                <p className="mt-3 text-sm leading-relaxed text-white/75">This doorway needs a camera-enabled browser. Deployed portals also need HTTPS.</p>
              </div>
            </div>
          )}
        </ArchWindow>
      </motion.div>

      <div className="relative z-10 mt-3 flex w-full max-w-[22rem] flex-col items-center px-1 text-center sm:mt-6">
        {cameraState === 'preview' && smileUnlocked && joySignature ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.35, duration: 0.5, ease: 'easeOut' }}
            className="w-full"
          >
            <JoySignatureCard signature={joySignature} />
          </motion.div>
        ) : null}

        {cameraState === 'idle' && (
          <p className="max-w-sm text-xs leading-relaxed text-white/60">
            Your smile is the key. Camera and face signals stay in your browser; only a playful, non-scientific creative signature begins the story.
          </p>
        )}

        {cameraState === 'requesting' && (
          <p className="max-w-sm text-sm leading-relaxed text-white/70">
            Your browser may ask for permission — it’s the key to this first door.
          </p>
        )}

        {cameraState === 'preview' && !smileUnlocked && smileError && (
          <p className="max-w-sm text-xs leading-relaxed text-rose-100/70">
            Refresh and try again if the signal does not begin.
          </p>
        )}

        {cameraState === 'denied' && (
          <button
            type="button"
            onClick={() => void requestCamera()}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-[#ffe8a8] px-6 py-3 font-bold text-purple-950 shadow-[0_8px_0_#b56a7a,0_14px_26px_rgba(20,8,42,0.38)] transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/40"
          >
            <RefreshCw className="size-5" aria-hidden="true" />
            Try camera again
          </button>
        )}
      </div>
      </motion.div>

      {entering && !reduceMotion && <EnterSparkles />}

      <AnimatePresence>
        {portalOpen && joySignature && (
          <PortalReveal
            signature={joySignature}
            smileScore={smileScore}
            smileStatus={smileStatus}
            wowScore={wowScore}
            onClose={returnToSmile}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

// The camera window is itself a little arched doorway, cut from the same
// silhouette as the landing page's portal-garden door.
function ArchWindow({ children, glowing }: { children: ReactNode; glowing: boolean }) {
  return (
    <div
      className={`relative w-[min(72vw,17.5rem)] overflow-hidden rounded-t-[999px] rounded-b-[1.4rem] border-2 transition-all duration-700 aspect-[10/13] ${
        glowing
          ? 'border-amber-100/85 shadow-[0_0_60px_14px_rgba(255,219,146,0.4),0_18px_40px_rgba(17,7,39,0.45)]'
          : 'border-[#ffe7a3]/45 shadow-[0_0_35px_6px_rgba(255,219,146,0.16),0_18px_40px_rgba(17,7,39,0.45)]'
      }`}
    >
      {children}
    </div>
  )
}

function SignatureStat({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[4.4rem] shrink-0 text-[10px] font-bold tracking-[0.14em] text-amber-100/70">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200"
          style={{ width: `${Math.min(Math.max(percent, 4), 100)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-white/80">{value}</span>
    </div>
  )
}

// The Joy Signature profile: a creative reading of one specific smile — its
// unique print, its ID, and the little measurements that composed it.
function JoySignatureCard({ signature }: { signature: JoySignature }) {
  return (
    <section className="w-full rounded-2xl border border-white/15 bg-[#241040]/92 p-3.5 text-left shadow-2xl shadow-black/40 backdrop-blur-md sm:p-4">
      <div className="flex items-center gap-3 sm:gap-3.5">
        <JoyPrint signature={signature} className="size-14 shrink-0 sm:size-16" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[9px] font-bold tracking-[0.2em] text-amber-100/70">YOUR JOY SIGNATURE</p>
            <p className="shrink-0 text-[10px] font-bold tracking-wider text-amber-100">{signature.momentCode}</p>
          </div>
          <p className="mt-0.5 truncate font-serif text-base font-black leading-tight text-white sm:text-lg">{signature.wonderTitle}</p>
          <p className="text-xs text-white/60">{signature.shape}</p>
        </div>
      </div>
      <div className="mt-2.5 grid gap-1.5 border-t border-white/10 pt-2.5 sm:mt-3 sm:pt-3">
        <SignatureStat label="BRIGHTNESS" value={`${signature.signalPercent}%`} percent={signature.signalPercent} />
        <SignatureStat
          label="HOLD"
          value={`${(signature.heldForMs / 1000).toFixed(1)}s`}
          percent={(signature.heldForMs / 4000) * 100}
        />
        <SignatureStat
          label="BLOOM"
          value={bloomLabel(signature.riseRate)}
          percent={(signature.riseRate / 1) * 100}
        />
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-white/40 sm:mt-2.5">
        A creative reading of this one smile — its print belongs to this moment alone. Never identity, never emotion analysis. Nothing leaves your browser.
      </p>
    </section>
  )
}

const enterSparks = Array.from({ length: 34 }, (_, index) => ({
  angle: (index / 34) * Math.PI * 2 + ((index * 29) % 10) / 10,
  distance: 140 + ((index * 53) % 220),
  size: 3 + ((index * 17) % 4),
  delay: ((index * 7) % 5) * 0.05,
  color: ['#ffdf8e', '#ffb45e', '#fff3c4', '#f5a9c6'][index % 4],
}))

// A burst of golden sparks the instant a smile carries the traveler through.
function EnterSparkles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center" aria-hidden="true">
      {enterSparks.map((spark, index) => (
        <motion.span
          key={index}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{
            x: Math.cos(spark.angle) * spark.distance,
            y: Math.sin(spark.angle) * spark.distance,
            opacity: [1, 1, 0],
            scale: [0.4, 1.15, 0.5],
          }}
          transition={{ duration: 0.95, delay: spark.delay, ease: 'easeOut' }}
          className="absolute rounded-full [grid-area:1/1]"
          style={{
            width: spark.size,
            height: spark.size,
            background: spark.color,
            boxShadow: `0 0 12px 3px ${spark.color}cc`,
          }}
        />
      ))}
    </div>
  )
}

function UnlockBubbles() {
  const bubbles = [
    [-180, -28, 10, 0], [-166, 22, 14, 0.8], [-151, -46, 18, 1.7], [-139, 36, 9, 2.2],
    [-124, -20, 16, 0.35], [-111, 48, 12, 1.25], [-96, -34, 20, 2.9], [-82, 28, 10, 3.4],
    [-68, -15, 15, 0.6], [-52, 40, 8, 2.5], [48, -42, 17, 1.9], [65, 18, 11, 3.1],
    [80, -31, 13, 0.15], [95, 44, 19, 2.7], [111, -18, 9, 1.45], [126, 36, 15, 3.7],
    [142, -46, 12, 0.95], [158, 22, 18, 2.15], [174, -27, 10, 3.3], [190, 39, 14, 1.05],
    [-42, 112, 8, 4], [46, -118, 11, 2.45], [-92, 86, 10, 4.3], [98, -94, 9, 3.85],
  ] as const
  const colors = [
    'rgba(255, 176, 210, 0.58)',
    'rgba(144, 225, 255, 0.52)',
    'rgba(255, 228, 139, 0.56)',
    'rgba(185, 162, 255, 0.54)',
    'rgba(123, 242, 203, 0.5)',
  ]

  return (
    <span className="pointer-events-none absolute bottom-1/2 left-1/2 z-0 size-0 overflow-visible" aria-hidden="true">
      {bubbles.map(([driftX, driftY, size, delay], index) => (
        <motion.span
          key={`${driftX}-${driftY}`}
          initial={{ opacity: 0, scale: 0.2, x: -size, y: -size }}
          animate={{
            opacity: [0, 0.9, 0.72, 0],
            scale: [0.2, 1, 1.2, 0.72],
            x: [-size, driftX * 0.72, driftX * 2.2, driftX * 3.6],
            y: [-size, driftY * 0.72, driftY * 2.25, driftY * 3.4],
          }}
          transition={{
            delay: delay * 0.28,
            duration: 2.1 + (index % 3) * 0.14,
            ease: 'easeOut',
            repeat: 0,
          }}
          style={{
            background: `radial-gradient(circle at 30% 26%, rgba(255,255,255,0.9), ${colors[index % colors.length]} 40%, rgba(255,255,255,0.08) 72%)`,
            boxShadow: `inset -2px -3px 5px rgba(255,255,255,0.25), 0 0 13px ${colors[index % colors.length]}`,
            height: size * 2.35,
            width: size * 2.35,
          }}
          className="absolute rounded-full border border-white/45"
        />
      ))}
    </span>
  )
}
