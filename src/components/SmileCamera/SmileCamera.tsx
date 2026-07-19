import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, RefreshCw, Sparkles } from 'lucide-react'
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSmileDetection } from './useSmileDetection'
import { createJoySignature, type JoySignature } from './createJoySignature'
import { PortalReveal } from '../Portal/PortalReveal'

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
  const handleSmileDetected = useCallback((moment: Parameters<typeof createJoySignature>[0]) => {
    setJoySignature(createJoySignature(moment))
    setCelebrationComplete(false)
    setSmileUnlocked(true)
  }, [])
  const { error: smileError, smileScore, status: smileStatus } = useSmileDetection({
    enabled: cameraState === 'preview' && !smileUnlocked,
    videoRef,
    onSmileDetected: handleSmileDetected,
  })

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const openPortal = () => {
    if (!smileUnlocked || !joySignature) return
    stopCamera()
    setPortalOpen(true)
  }

  const returnToSmile = () => {
    setPortalOpen(false)
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

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1b1033] px-6 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_22%,rgba(253,179,255,0.25),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(255,191,117,0.22),transparent_30%),radial-gradient(circle_at_55%_95%,rgba(119,220,205,0.22),transparent_32%)]" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute -right-24 -top-20 -z-10 size-96 rounded-full border border-white/15"
      />

      <section className="w-full max-w-xl">
        <button
          type="button"
          onClick={handleBack}
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the doorway
        </button>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="rounded-[2.5rem] border border-white/20 bg-white/10 p-7 text-center shadow-2xl shadow-purple-950/45 backdrop-blur-xl sm:p-10"
        >
          <p className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.28em] text-amber-100/80">
            <Sparkles className="size-4" aria-hidden="true" />
            THE FIRST LITTLE DOOR
          </p>

          <AnimatePresence mode="wait">
            {cameraState === 'idle' && <IdleState onRequest={requestCamera} />}
            {cameraState === 'requesting' && <RequestingState />}
            {cameraState === 'preview' && (
              <PreviewState
                videoRef={videoRef}
                smileError={smileError}
                smileScore={smileScore}
                smileStatus={smileStatus}
                smileUnlocked={smileUnlocked}
                joySignature={joySignature}
                onOpenPortal={openPortal}
                celebrationComplete={celebrationComplete}
                onCelebrationComplete={() => setCelebrationComplete(true)}
              />
            )}
            {cameraState === 'denied' && <DeniedState onRetry={requestCamera} />}
            {cameraState === 'unsupported' && <UnsupportedState />}
          </AnimatePresence>
        </motion.div>
      </section>
      <AnimatePresence>
        {portalOpen && joySignature && (
          <PortalReveal signature={joySignature} onClose={returnToSmile} />
        )}
      </AnimatePresence>
    </main>
  )
}

function CameraFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto mt-7 aspect-square w-full max-w-[21rem] overflow-hidden rounded-[2rem] border border-white/20 bg-purple-950/45 shadow-inner shadow-purple-950/50">
      <div className="absolute inset-3 rounded-[1.55rem] border border-amber-100/30" />
      {children}
    </div>
  )
}

function IdleState({ onRequest }: { onRequest: () => void }) {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="mt-7"
    >
      <CameraFrame>
        <div className="flex h-full flex-col items-center justify-center p-8">
          <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-rose-300 to-fuchsia-400 text-purple-950 shadow-lg shadow-rose-950/25">
            <Camera className="size-9" aria-hidden="true" />
          </div>
          <span className="mt-5 text-sm font-semibold text-white/75">A tiny window is waiting</span>
        </div>
      </CameraFrame>
      <h1 className="mt-8 font-serif text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
        Let’s say hello.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/70">
        Open your camera when you’re ready. JOY:D only looks while this little window is open.
      </p>
      <button
        type="button"
        onClick={onRequest}
        className="mt-8 inline-flex items-center gap-3 rounded-full bg-amber-100 px-6 py-3.5 font-bold text-purple-950 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/40"
      >
        <Camera className="size-5" aria-hidden="true" />
        Open my portal
      </button>
    </motion.div>
  )
}

function RequestingState() {
  return (
    <motion.div
      key="requesting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-7"
    >
      <CameraFrame>
        <div className="flex h-full items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            className="size-24 rounded-full border-2 border-amber-100/20 border-t-amber-100"
          />
        </div>
      </CameraFrame>
      <h1 className="mt-8 font-serif text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
        Opening your little window…
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/70">
        Your browser may ask for permission. It’s the key to this first door.
      </p>
    </motion.div>
  )
}

function PreviewState({
  videoRef,
  smileError,
  smileScore,
  smileStatus,
  smileUnlocked,
  joySignature,
  onOpenPortal,
  celebrationComplete,
  onCelebrationComplete,
}: {
  videoRef: RefObject<HTMLVideoElement | null>
  smileError: string | null
  smileScore: number
  smileStatus: 'idle' | 'loading' | 'ready' | 'no-face' | 'smiling' | 'unavailable'
  smileUnlocked: boolean
  joySignature: JoySignature | null
  onOpenPortal: () => void
  celebrationComplete: boolean
  onCelebrationComplete: () => void
}) {
  const reduceMotion = useReducedMotion()
  const signalPercent = Math.round(smileScore * 100)
  const statusCopy = {
    idle: 'Waking the smile signal…',
    loading: 'Learning the shape of a smile…',
    ready: 'A gentle smile will open the first door.',
    'no-face': 'Step into the little window.',
    smiling: 'We see a little spark… keep smiling!',
    unavailable: 'The smile signal needs another moment.',
  }[smileStatus]

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="mt-7"
    >
      <CameraFrame>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full scale-x-[-1] object-cover"
          aria-label="Live camera preview"
        />
        <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-purple-950/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
          <span className="size-2 rounded-full bg-rose-300 shadow-[0_0_12px_3px_rgba(253,164,175,0.6)]" />
          LIVE
        </div>
      </CameraFrame>
      <h1 className="mt-8 font-serif text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
        {smileUnlocked ? 'A door appeared in your smile.' : 'Show us your smile.'}
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/70">
        {smileUnlocked
          ? 'Your first JOY:D signal is glowing. The next build step will turn it into a world.'
          : statusCopy}
      </p>
      {smileStatus !== 'unavailable' && !smileUnlocked && (
        <div className="mx-auto mt-7 max-w-xs">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              animate={{ width: `${Math.min(signalPercent, 100)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200"
              transition={{ duration: 0.18 }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold tracking-wide text-white/55">
            JOY SIGNAL {signalPercent}%
          </p>
        </div>
      )}
      <div className="relative mt-7 inline-flex">
        {smileUnlocked && !celebrationComplete && !reduceMotion && <UnlockBubbles />}
        <button
          type={smileUnlocked ? 'button' : undefined}
          onClick={smileUnlocked ? onOpenPortal : undefined}
          disabled={!smileUnlocked}
          aria-label={smileUnlocked ? 'Open my first portal' : undefined}
          className="relative z-10 overflow-hidden rounded-full p-px disabled:cursor-default"
        >
          {smileUnlocked && celebrationComplete && !reduceMotion && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 5.5, ease: 'linear', repeat: Infinity }}
              className="absolute -inset-[140%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_70deg,rgba(255,255,255,0.16)_110deg,rgba(255,244,181,0.95)_135deg,rgba(255,255,255,0.18)_160deg,transparent_195deg,transparent_360deg)]"
              aria-hidden="true"
            />
          )}
          <motion.div
            animate={
              smileUnlocked && !celebrationComplete && !reduceMotion
                ? {
                    rotate: [0, -4, 4, -3, 3, 0],
                    scale: [1, 1.08, 1],
                    x: [0, -2, 2, -1, 1, 0],
                  }
                : undefined
            }
            transition={
              smileUnlocked && !celebrationComplete && !reduceMotion
                ? { duration: 2.4, ease: 'easeInOut' }
                : undefined
            }
            onAnimationComplete={() => {
              if (smileUnlocked && !celebrationComplete && !reduceMotion) {
                onCelebrationComplete()
              }
            }}
            className="relative inline-flex items-center gap-2 rounded-full bg-[#6b5874]/95 px-4 py-2 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-200/10"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {smileUnlocked
              ? celebrationComplete
                ? 'Enter your first JOY:D world'
                : 'First door unlocked'
              : smileError
                ? 'Signal unavailable'
                : 'Listening locally'}
            {smileUnlocked && (
              <motion.span
                animate={reduceMotion || !celebrationComplete ? undefined : { opacity: [0.5, 1, 0.5], rotate: [0, 18, -12, 0] }}
                transition={reduceMotion || !celebrationComplete ? undefined : { duration: 1.1, repeat: Infinity }}
                className="text-base leading-none"
                aria-hidden="true"
              >
                {celebrationComplete ? <ArrowRight className="size-4" /> : '✦'}
              </motion.span>
            )}
          </motion.div>
        </button>
      </div>
      {smileError && (
        <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-rose-100/70">
          Refresh and try again if the signal does not begin.
        </p>
      )}
      {smileUnlocked && joySignature && <JoySignatureCard signature={joySignature} />}
    </motion.div>
  )
}

function JoySignatureCard({ signature }: { signature: JoySignature }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.section
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.18, duration: 0.45, ease: 'easeOut' }}
      className="relative mx-auto mt-7 max-w-sm overflow-hidden rounded-3xl p-px text-left"
    >
      <motion.span
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={reduceMotion ? undefined : { duration: 8.5, ease: 'linear', repeat: Infinity }}
        className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_85deg,rgba(176,227,255,0.14)_115deg,rgba(255,232,163,0.85)_145deg,rgba(255,255,255,0.16)_170deg,transparent_205deg,transparent_360deg)]"
        aria-hidden="true"
      />
      <div className="relative rounded-[1.42rem] border border-white/15 bg-[#2a154b] p-5">
        <p className="text-xs font-bold tracking-[0.18em] text-amber-100/80">YOUR JOY:D SMILE SIGNATURE</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-serif text-2xl font-bold text-white">{signature.wonderTitle}</p>
            <p className="mt-1 text-sm text-white/65">{signature.shape} · {signature.signalPercent}% signal</p>
          </div>
          <div className="flex -space-x-2" aria-label="Your color trail">
            {signature.colorTrail.map((color) => (
              <span
                key={color}
                className="size-7 rounded-full border-2 border-purple-950/50 shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-white/50">
          <span>Creative reading of this moment · not identity or emotion analysis</span>
          <span className="shrink-0 font-semibold tracking-wider text-white/60">{signature.momentCode}</span>
        </div>
        <p className="mt-2 text-xs text-white/40">No camera frames or face data are captured, saved, or sent. Opening the portal uses this creative signature to form a world.</p>
      </div>
    </motion.section>
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

function DeniedState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      key="denied"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mt-7"
    >
      <CameraFrame>
        <div className="flex h-full flex-col items-center justify-center p-8">
          <span className="text-6xl">☁️</span>
          <span className="mt-5 text-sm font-semibold text-white/75">The window stayed closed</span>
        </div>
      </CameraFrame>
      <h1 className="mt-8 font-serif text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
        No worries at all.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/70">
        JOY:D needs camera permission to begin. You can try again whenever it feels right.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-8 inline-flex items-center gap-3 rounded-full bg-amber-100 px-6 py-3.5 font-bold text-purple-950 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/40"
      >
        <RefreshCw className="size-5" aria-hidden="true" />
        Try camera again
      </button>
    </motion.div>
  )
}

function UnsupportedState() {
  return (
    <motion.div
      key="unsupported"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mt-7"
    >
      <CameraFrame>
        <div className="flex h-full flex-col items-center justify-center p-8">
          <span className="text-6xl">🔮</span>
          <span className="mt-5 text-sm font-semibold text-white/75">This doorway needs a camera</span>
        </div>
      </CameraFrame>
      <h1 className="mt-8 font-serif text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
        Try a camera-enabled browser.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/70">
        JOY:D opens its first portal through your camera. Localhost works while you build; a deployed version will need HTTPS.
      </p>
    </motion.div>
  )
}
