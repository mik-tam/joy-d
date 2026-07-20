import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, HeartHandshake, RefreshCw, Share2, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { JoySignature } from '../SmileCamera/createJoySignature'
import type { SmileDetectionStatus } from '../SmileCamera/useSmileDetection'
import {
  generateJoyCapsule,
  JoyCapsuleError,
  type JoyCapsule,
} from '../../data/joyCapsule'
import { findSmileMatch, SmileMatchError, type SmileMatch } from '../../data/smileMatch'
import { saveVoyage } from '../../data/joyJournal'
import { shareJoyStoryCard } from '../../data/joyStoryCard'
import { generateSceneImages, type WorldSceneImages } from '../../data/joySceneImages'
import { playConnectionChime, playDiscoveryChime, playHiddenWonderSound, setJoySoundsEnabled, startWorldSoundscape, stopJoySounds, stopWorldSoundscape } from '../../data/joySounds'
import { WorldSecret, WorldStage } from './WorldStage'

type PortalRevealProps = {
  onClose: () => void
  signature: JoySignature
  smileScore: number
  smileStatus: SmileDetectionStatus
}

type CapsuleStatus =
  | 'loading'
  | 'ready'
  | 'missing-key'
  | 'quota-exhausted'
  | 'service-offline'
  | 'auth-failed'
  | 'rate-limited'
  | 'model-unavailable'
  | 'error'

type PortalPhase = 'story' | 'world'

export function PortalReveal({ onClose, signature, smileScore, smileStatus }: PortalRevealProps) {
  const reduceMotion = useReducedMotion()
  const [capsules, setCapsules] = useState<JoyCapsule[]>([])
  const [activeCapsuleIndex, setActiveCapsuleIndex] = useState(0)
  const [capsuleStatus, setCapsuleStatus] = useState<CapsuleStatus>('loading')
  const [isDeepening, setIsDeepening] = useState(false)
  const [deepeningError, setDeepeningError] = useState<string | null>(null)
  const [storyOpen, setStoryOpen] = useState(false)
  const [chimesOn, setChimesOn] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [revealedWorlds, setRevealedWorlds] = useState<Set<string>>(() => new Set())
  const [smileCharge, setSmileCharge] = useState(0)
  const [sceneImagesByWorld, setSceneImagesByWorld] = useState<Record<string, WorldSceneImages>>({})
  const [imageFailedWorlds, setImageFailedWorlds] = useState<Set<string>>(() => new Set())
  const [visitedWorlds, setVisitedWorlds] = useState<Set<string>>(() => new Set())
  const [phase, setPhase] = useState<PortalPhase>('story')
  const [typedDone, setTypedDone] = useState(false)
  const [skipTyping, setSkipTyping] = useState(false)
  const initialRequestStarted = useRef(false)
  const smileScoreRef = useRef(smileScore)
  const chargeStartRef = useRef<number | null>(null)
  const needsReleaseRef = useRef(false)
  const travel = reduceMotion ? 24 : 1300
  const duration = reduceMotion ? 0.2 : 0.95
  const activeCapsule = capsules[activeCapsuleIndex] ?? null
  const activeWorldName = activeCapsule?.worldName ?? null
  const discoveryNumber = activeCapsuleIndex + 1
  const canGoDeeper = capsules.length < 3

  // Each smile shape is its own kind of key: quick bright peaks, long gentle
  // holds, or something in between.
  const chargeThreshold =
    signature.shape === 'Bright Spark' ? 0.6 : signature.shape === 'Slow Sunrise' ? 0.48 : 0.54
  const chargeHoldMs =
    signature.shape === 'Slow Sunrise' ? 1500 : signature.shape === 'Gentle Bloom' ? 1100 : 850

  const setErrorStatus = useCallback((error: unknown) => {
    if (error instanceof JoyCapsuleError && error.code === 'AI_NOT_CONFIGURED') {
      setCapsuleStatus('missing-key')
    } else if (error instanceof JoyCapsuleError && error.code === 'AI_QUOTA_EXHAUSTED') {
      setCapsuleStatus('quota-exhausted')
    } else if (error instanceof JoyCapsuleError && error.code === 'CAPSULE_SERVICE_UNAVAILABLE') {
      setCapsuleStatus('service-offline')
    } else if (error instanceof JoyCapsuleError && error.code === 'AI_AUTH_FAILED') {
      setCapsuleStatus('auth-failed')
    } else if (error instanceof JoyCapsuleError && error.code === 'AI_RATE_LIMITED') {
      setCapsuleStatus('rate-limited')
    } else if (error instanceof JoyCapsuleError && error.code === 'AI_MODEL_UNAVAILABLE') {
      setCapsuleStatus('model-unavailable')
    } else {
      setCapsuleStatus('error')
    }
  }, [])

  const gatherFirstWorld = useCallback(async () => {
    setCapsuleStatus('loading')
    try {
      const firstCapsule = await generateJoyCapsule(signature)
      setCapsules([firstCapsule])
      setActiveCapsuleIndex(0)
      setCapsuleStatus('ready')
    } catch (error) {
      setErrorStatus(error)
    }
  }, [setErrorStatus, signature])

  const goDeeper = useCallback(async () => {
    if (isDeepening || capsules.length >= 3) return
    playDiscoveryChime()
    setIsDeepening(true)
    setDeepeningError(null)
    try {
      const nextCapsule = await generateJoyCapsule(signature, capsules.map(({ worldName }) => worldName))
      setCapsules((current) => [...current, nextCapsule])
      setActiveCapsuleIndex(capsules.length)
    } catch (error) {
      if (error instanceof JoyCapsuleError && error.code === 'AI_RATE_LIMITED') {
        setDeepeningError('The world-maker is busy. Give it a moment, then follow the glimmer again.')
      } else if (error instanceof JoyCapsuleError && error.code === 'AI_TIMEOUT') {
        setDeepeningError('That world took too long to gather. Your current discovery is safe — try again when you’re ready.')
      } else {
        setDeepeningError('A little stardust got tangled. Your current discovery is safe — try going deeper again.')
      }
    } finally {
      setIsDeepening(false)
    }
  }, [capsules, isDeepening, signature])

  useEffect(() => {
    if (initialRequestStarted.current) return
    initialRequestStarted.current = true
    void gatherFirstWorld()
  }, [gatherFirstWorld])

  useEffect(() => {
    smileScoreRef.current = smileScore
  }, [smileScore])

  // Entering a world for the first time begins in the story void; revisits
  // step straight back into the finished world.
  useEffect(() => {
    if (!activeWorldName) return
    if (visitedWorlds.has(activeWorldName)) {
      setPhase('world')
      return
    }
    setPhase('story')
    setTypedDone(false)
    setSkipTyping(false)
  }, [activeWorldName, visitedWorlds])

  // The story doubles as the loading screen: once it has been read and the
  // painted scene has arrived (or definitively failed), the world fades in.
  useEffect(() => {
    if (phase !== 'story' || !activeWorldName || capsuleStatus !== 'ready' || !typedDone) return
    if (!sceneImagesByWorld[activeWorldName] && !imageFailedWorlds.has(activeWorldName)) return
    setPhase('world')
    setVisitedWorlds((current) => new Set(current).add(activeWorldName))
  }, [phase, activeWorldName, capsuleStatus, typedDone, sceneImagesByWorld, imageFailedWorlds])

  useEffect(() => {
    if (!activeCapsule) return
    const { worldName } = activeCapsule
    let cancelled = false
    void generateSceneImages(activeCapsule).then((images) => {
      if (cancelled) return
      if (images) {
        setSceneImagesByWorld((current) =>
          current[worldName] ? current : { ...current, [worldName]: images },
        )
      } else {
        setImageFailedWorlds((current) => new Set(current).add(worldName))
      }
    })
    return () => {
      cancelled = true
    }
  }, [activeCapsule])

  useEffect(() => {
    if (phase !== 'world' || capsuleStatus !== 'ready' || isDeepening || storyOpen) {
      chargeStartRef.current = null
      setSmileCharge(0)
      return
    }

    const deeperAllowed = capsules.length < 3
    const tick = setInterval(() => {
      const score = smileScoreRef.current
      if (score < chargeThreshold * 0.8) needsReleaseRef.current = false
      if (needsReleaseRef.current) return

      if (score >= chargeThreshold) {
        chargeStartRef.current ??= performance.now()
        const progress = Math.min((performance.now() - chargeStartRef.current) / chargeHoldMs, 1)
        setSmileCharge(progress)
        if (progress >= 1) {
          chargeStartRef.current = null
          needsReleaseRef.current = true
          setSmileCharge(0)
          if (deeperAllowed) void goDeeper()
          else setStoryOpen(true)
        }
      } else if (chargeStartRef.current !== null) {
        chargeStartRef.current = null
        setSmileCharge(0)
      }
    }, 120)

    return () => clearInterval(tick)
  }, [phase, capsuleStatus, capsules.length, chargeHoldMs, chargeThreshold, goDeeper, isDeepening, storyOpen])

  useEffect(() => () => {
    stopJoySounds()
    window.speechSynthesis?.cancel()
  }, [])

  useEffect(() => {
    // Re-assert the module-level sound flag here: React StrictMode's dev
    // double-mount runs the unmount cleanup (stopJoySounds) once on open,
    // which silently disabled audio even though the toggle showed "On".
    setJoySoundsEnabled(chimesOn)
    if (chimesOn && activeCapsule) startWorldSoundscape(activeCapsule.soundMood)
  }, [activeCapsule, chimesOn])

  const toggleChimes = () => {
    const nextValue = !chimesOn
    setChimesOn(nextValue)
    setJoySoundsEnabled(nextValue)
    if (nextValue && activeCapsule) startWorldSoundscape(activeCapsule.soundMood)
    if (!nextValue) stopWorldSoundscape()
  }

  const stopReading = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setIsReading(false)
  }

  const readCapsuleAloud = (capsule: JoyCapsule) => {
    if (!('speechSynthesis' in window)) return
    stopReading()
    const utterance = new SpeechSynthesisUtterance(`${capsule.worldName}. ${capsule.story} ${capsule.quote}`)
    utterance.rate = 0.88
    utterance.pitch = 1.08
    utterance.onend = () => setIsReading(false)
    utterance.onerror = () => setIsReading(false)
    setIsReading(true)
    window.speechSynthesis.speak(utterance)
  }

  const revealHiddenWonder = () => {
    if (!activeCapsule || revealedWorlds.has(activeCapsule.worldName)) return
    setRevealedWorlds((current) => new Set([...current, activeCapsule.worldName]))
    playHiddenWonderSound()
  }

  const handleTypedDone = useCallback(() => setTypedDone(true), [])
  const worldReady = activeWorldName
    ? Boolean(sceneImagesByWorld[activeWorldName]) || imageFailedWorlds.has(activeWorldName)
    : false

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 isolate flex items-center justify-center overflow-hidden bg-[#0b0518] px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-title"
    >
      <div
        className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_21%_28%,rgba(255,255,255,0.5)_0_1px,transparent_1.6px),radial-gradient(circle_at_67%_57%,rgba(255,255,255,0.3)_0_1px,transparent_1.6px),radial-gradient(circle_at_44%_82%,rgba(255,255,255,0.38)_0_1px,transparent_1.6px),radial-gradient(circle_at_86%_16%,rgba(255,255,255,0.32)_0_1px,transparent_1.6px)]
          [background-size:140px_150px,110px_120px,160px_140px,120px_170px]"
        aria-hidden="true"
      />
      <div className="joy-paper-grain absolute inset-0" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {phase === 'world' && activeCapsule && (
          <WorldStage
            capsule={activeCapsule}
            images={sceneImagesByWorld[activeCapsule.worldName]}
            smileScore={smileScore}
            colorTrail={signature.colorTrail}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'story' && (
          <motion.div
            key="cosmic-glow"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            transition={{ delay: reduceMotion ? 0 : 0.3, duration: reduceMotion ? 0.2 : 1.1, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
            aria-hidden="true"
          >
            <PortalRing smileScore={smileScore} />
          </motion.div>
        )}
      </AnimatePresence>

      {[...Array(18)].map((_, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
          animate={
            reduceMotion
              ? { opacity: 0 }
              : {
                  opacity: [0, 0.9, 0],
                  scale: [0.3, 1, 0.45],
                  x: Math.cos((index / 18) * Math.PI * 2) * (90 + (index % 4) * 32),
                  y: Math.sin((index / 18) * Math.PI * 2) * (90 + (index % 3) * 38),
                }
          }
          transition={reduceMotion ? { duration: 0 } : { delay: 0.35 + (index % 6) * 0.09, duration: 2.3, ease: 'easeOut' }}
          className="absolute size-2 rounded-full bg-amber-100 shadow-[0_0_18px_5px_rgba(255,227,151,0.42)]"
          aria-hidden="true"
        />
      ))}

      <div className="absolute left-1/2 top-1/2 h-[24rem] w-full max-w-sm -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        <motion.div
          initial={{ x: 0, rotate: 0 }}
          animate={{ x: -travel, rotate: reduceMotion ? 0 : -8, opacity: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.18, duration, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-1/2 w-1/2 origin-left rounded-l-[2.5rem] border border-amber-100/25 bg-[linear-gradient(120deg,rgba(87,48,120,0.98),rgba(42,21,75,0.92))] shadow-[-12px_0_35px_rgba(255,204,130,0.12)]"
        >
          <div className="absolute inset-4 rounded-l-[2rem] border border-white/10" />
        </motion.div>
        <motion.div
          initial={{ x: 0, rotate: 0 }}
          animate={{ x: travel, rotate: reduceMotion ? 0 : 8, opacity: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.18, duration, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 right-1/2 w-1/2 origin-right rounded-r-[2.5rem] border border-amber-100/25 bg-[linear-gradient(240deg,rgba(87,48,120,0.98),rgba(42,21,75,0.92))] shadow-[12px_0_35px_rgba(255,204,130,0.12)]"
        >
          <div className="absolute inset-4 rounded-r-[2rem] border border-white/10" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'story' && (
          <motion.section
            key={`${activeWorldName ?? 'gathering'}-story`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18, transition: { duration: 0.7, ease: 'easeIn' } }}
            transition={{ delay: reduceMotion ? 0.2 : 0.9, duration: 0.5, ease: 'easeOut' }}
            onClick={() => setSkipTyping(true)}
            className="relative z-10 w-full max-w-xl cursor-default select-none text-center"
          >
            {capsuleStatus === 'loading' ? (
              <>
                <p className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.28em] text-amber-100/85">
                  <Sparkles className="size-4" aria-hidden="true" />
                  THE FIRST LITTLE DOOR
                </p>
                <h1 id="portal-title" className="mt-4 font-serif text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                  Your smile opened a way in.
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/70">
                  A new JOY:D world is gathering just beyond this glow. Its colours carry your {signature.shape.toLowerCase()}.
                </p>
                <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-amber-100/20 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
                    className="size-3 rounded-full border-2 border-amber-100/30 border-t-amber-100"
                  />
                  World gathering…
                </div>
              </>
            ) : capsuleStatus !== 'ready' || !activeCapsule ? (
              <CapsuleProblem status={capsuleStatus} onRetry={() => void gatherFirstWorld()} />
            ) : (
              <>
                <p className="text-xs font-bold tracking-[0.3em] text-amber-100/75">
                  {discoveryNumber === 1 ? 'THE FIRST LITTLE DOOR' : `DISCOVERY ${discoveryNumber}`} · DOOR {discoveryNumber} OF 3
                </p>
                <h1 id="portal-title" className="mt-3 font-serif text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                  {activeCapsule.worldName}
                </h1>
                <Typewriter
                  text={activeCapsule.story}
                  skip={skipTyping}
                  onDone={handleTypedDone}
                />
                <AnimatePresence mode="wait">
                  {typedDone && !worldReady ? (
                    <motion.p
                      key="painting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-amber-100/85"
                    >
                      <motion.span
                        animate={reduceMotion ? undefined : { rotate: 360 }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                        aria-hidden="true"
                      >
                        ✦
                      </motion.span>
                      The world is painting itself…
                    </motion.p>
                  ) : !typedDone ? (
                    <motion.p
                      key="skip-hint"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 2 }}
                      className="mt-7 text-xs text-white/35"
                    >
                      tap anywhere to hurry the story along
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {phase === 'world' && activeCapsule && capsuleStatus === 'ready' && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.9, duration: 0.7 }}
            className="pointer-events-none absolute inset-x-0 top-12 z-10 mx-auto max-w-2xl px-16 text-center"
          >
            <p className="text-[10px] font-bold tracking-[0.3em] text-white/70 drop-shadow-[0_1px_6px_rgba(9,4,25,0.8)]">
              DOOR {discoveryNumber} OF 3
            </p>
            <h1 id="portal-title" className="mt-1 font-serif text-3xl font-black tracking-[-0.04em] text-white drop-shadow-[0_2px_14px_rgba(9,4,25,0.7)] sm:text-4xl">
              {activeCapsule.worldName}
            </h1>
            <p className="mt-1.5 text-sm italic text-amber-50/90 drop-shadow-[0_1px_8px_rgba(9,4,25,0.8)]">
              “{activeCapsule.quote}”
            </p>
            <p className="mx-auto mt-3 max-w-lg rounded-2xl bg-[#10051f]/35 px-4 py-2.5 text-xs leading-relaxed text-white/85 backdrop-blur-[3px] drop-shadow-[0_1px_6px_rgba(9,4,25,0.8)] sm:text-sm">
              {activeCapsule.story}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 1.2, duration: 0.6 }}
            className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2.5 px-6"
          >
            {deepeningError && (
              <p className="max-w-sm rounded-xl bg-rose-100/10 px-3 py-2 text-center text-xs leading-relaxed text-rose-50/85 backdrop-blur">
                {deepeningError}
              </p>
            )}
            <div className="flex items-center gap-4">
              {capsules.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {capsules.map((capsule, index) => (
                    <button
                      key={capsule.worldName}
                      type="button"
                      onClick={() => {
                        stopReading()
                        setActiveCapsuleIndex(index)
                      }}
                      className={`size-2.5 rounded-full transition focus:outline-none focus:ring-2 focus:ring-amber-100/60 ${index === activeCapsuleIndex ? 'bg-amber-100' : 'bg-white/30 hover:bg-white/55'}`}
                      aria-label={`Revisit ${capsule.worldName}`}
                      aria-current={index === activeCapsuleIndex ? 'step' : undefined}
                    />
                  ))}
                </div>
              )}
              {canGoDeeper ? (
                <button
                  type="button"
                  onClick={() => void goDeeper()}
                  disabled={isDeepening}
                  className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-100/45 bg-[#160a31]/70 px-5 py-2.5 text-sm font-bold text-amber-50 backdrop-blur transition hover:bg-amber-100/20 disabled:cursor-wait disabled:opacity-75 focus:outline-none focus:ring-4 focus:ring-amber-100/20"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-amber-100/30 transition-[width] duration-150"
                    style={{ width: `${Math.round(smileCharge * 100)}%` }}
                  />
                  <span className="relative inline-flex items-center gap-2">
                    {isDeepening ? 'Following the glimmer…' : smileCharge > 0 ? 'Your smile is opening it…' : 'Go deeper'}
                    {isDeepening ? <Sparkles className="size-4 animate-pulse" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStoryOpen(true)}
                  className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-100/40 bg-amber-100 px-5 py-2.5 text-sm font-bold text-purple-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/30"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-white/60 transition-[width] duration-150"
                    style={{ width: `${Math.round(smileCharge * 100)}%` }}
                  />
                  <span className="relative inline-flex items-center gap-2">
                    <Sparkles className="size-4" aria-hidden="true" />
                    {smileCharge > 0 ? 'Your smile is gathering it…' : 'Create my Joy Story'}
                  </span>
                </button>
              )}
            </div>
            <p className="text-xs leading-relaxed text-white/45 drop-shadow-[0_1px_6px_rgba(9,4,25,0.8)]">
              {canGoDeeper
                ? 'Hold a smile — it charges the next door. Tapping works too.'
                : 'One long smile gathers your Joy Story. Tapping works too.'}
            </p>
          </motion.div>
        </>
      )}

      {phase === 'world' && activeCapsule && (
        <WorldSecret
          capsule={activeCapsule}
          hiddenRevealed={revealedWorlds.has(activeCapsule.worldName)}
          onRevealHidden={revealHiddenWonder}
        />
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#160a31]/60 px-3 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Return to my smile
      </button>

      <div className="absolute right-5 top-5 z-20 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={toggleChimes}
          aria-pressed={chimesOn}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#160a31]/60 px-3 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          {chimesOn ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          World sound: {chimesOn ? 'On' : 'Off'}
        </button>
        {phase === 'world' && activeCapsule && capsuleStatus === 'ready' && (
          <button
            type="button"
            onClick={() => readCapsuleAloud(activeCapsule)}
            disabled={isReading}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#160a31]/60 px-3 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <Volume2 className="size-4" aria-hidden="true" />
            {isReading ? 'The world is speaking…' : 'Hear this world'}
          </button>
        )}
      </div>

      <div className="absolute bottom-5 left-5 z-20 flex max-w-[15rem] items-start gap-3 rounded-2xl border border-white/15 bg-[#160a31]/65 px-4 py-3 backdrop-blur">
        <motion.span
          animate={reduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-1 size-2.5 shrink-0 rounded-full bg-amber-200"
          style={{ boxShadow: `0 0 ${6 + smileScore * 14}px ${2 + smileScore * 5}px rgba(255,227,151,${0.25 + smileScore * 0.5})` }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-snug text-white/85">
            {smileStatus === 'no-face'
              ? 'Step into view — this world dims without you'
              : smileStatus === 'unavailable' || smileStatus === 'idle'
                ? 'Smile signal resting — tapping works too'
                : 'Your smile is lighting this world'}
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200 transition-[width] duration-150"
              style={{ width: `${Math.round(Math.min(smileScore, 1) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-white/45">
            Camera stays in your browser only. Leaving the portal closes it.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {storyOpen && capsules.length === 3 && (
          <SmileStory
            signature={signature}
            capsules={capsules}
            onClose={() => setStoryOpen(false)}
            onBeginAgain={onClose}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// A slowly turning ring of golden light with a bright shine sweeping around
// it. The live smile feeds it: the light spill widens, the rim glow deepens,
// and a second, faster shine spins up as the smile grows.
function PortalRing({ smileScore }: { smileScore: number }) {
  const reduceMotion = useReducedMotion()
  const glow = Math.min(Math.max(smileScore, 0), 1)
  const ringMask =
    'radial-gradient(closest-side, transparent calc(100% - 17px), black calc(100% - 13px), black calc(100% - 3px), transparent 100%)'
  const shineArc = (peak: string, ember: string) =>
    `conic-gradient(from 0deg, transparent 0deg, ${ember} 55deg, ${peak} 95deg, #fffdf2 110deg, ${peak} 125deg, ${ember} 165deg, transparent 215deg, transparent 360deg)`

  return (
    <>
      <div
        className="size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,216,143,0.55)_0%,rgba(244,169,198,0.22)_45%,transparent_65%)] blur-2xl transition-all duration-500 [grid-area:1/1]"
        style={{ opacity: 0.3 + glow * 0.7, transform: `scale(${0.9 + glow * 0.28})` }}
      />
      <motion.div
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 16, ease: 'linear', repeat: Infinity }}
        className="size-[27rem] rounded-full [grid-area:1/1]"
        style={{
          background: shineArc('rgba(255,224,158,0.95)', 'rgba(255,190,120,0.14)'),
          WebkitMaskImage: ringMask,
          maskImage: ringMask,
          filter: 'blur(0.6px) drop-shadow(0 0 14px rgba(255,214,140,0.6))',
          opacity: 0.55 + glow * 0.45,
        }}
      />
      <motion.div
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 4.2, ease: 'linear', repeat: Infinity }}
        className="size-[27rem] rounded-full transition-opacity duration-300 [grid-area:1/1]"
        style={{
          background: shineArc('rgba(255,242,205,1)', 'rgba(255,205,135,0.16)'),
          WebkitMaskImage: ringMask,
          maskImage: ringMask,
          filter: 'blur(1.1px) drop-shadow(0 0 20px rgba(255,228,165,0.85))',
          opacity: reduceMotion ? 0 : glow * 0.95,
        }}
      />
      <div
        className="size-[27rem] rounded-full border border-amber-100/30 transition-shadow duration-300 [grid-area:1/1]"
        style={{
          boxShadow: `0 0 ${18 + glow * 60}px ${3 + glow * 15}px rgba(255,214,140,${0.12 + glow * 0.42}), inset 0 0 ${10 + glow * 34}px rgba(255,214,140,${0.08 + glow * 0.3})`,
        }}
      />
    </>
  )
}

function Typewriter({ text, skip, onDone }: { text: string; skip: boolean; onDone: () => void }) {
  const reduceMotion = useReducedMotion()
  const [count, setCount] = useState(0)
  const doneNotified = useRef(false)

  useEffect(() => {
    setCount(0)
    doneNotified.current = false
  }, [text])

  useEffect(() => {
    if (reduceMotion || skip || count >= text.length) {
      if (count < text.length) setCount(text.length)
      if (!doneNotified.current && (reduceMotion || skip || count >= text.length)) {
        doneNotified.current = true
        onDone()
      }
      return
    }
    const timer = setTimeout(() => setCount((current) => current + 1), 75)
    return () => clearTimeout(timer)
  }, [count, onDone, reduceMotion, skip, text])

  const finished = count >= text.length

  return (
    <p className="mx-auto mt-6 max-w-lg font-serif text-lg leading-8 text-white/90">
      {text.slice(0, count)}
      {!finished && (
        <span className="animate-pulse text-amber-200" aria-hidden="true">▍</span>
      )}
    </p>
  )
}

function CapsuleProblem({ status, onRetry }: { status: CapsuleStatus; onRetry: () => void }) {
  const message =
    status === 'missing-key' ? (
      <>This world needs an AI provider key before it can bloom. Add an OpenAI or OpenRouter key to your local <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, then open the portal again.</>
    ) : status === 'quota-exhausted' ? (
      <>This OpenAI project has no available API quota. Add credits, raise the project budget, or use an OpenRouter key instead.</>
    ) : status === 'service-offline' ? (
      <>The local JOY:D capsule service is not running. Stop the old dev server and restart this project with <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>.</>
    ) : status === 'auth-failed' ? (
      <>JOY:D can reach the AI provider, but it cannot verify the key. Check the key in <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, then restart <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>.</>
    ) : status === 'rate-limited' ? (
      <>The world-maker is busy right now. Wait a moment, then try gathering this world again.</>
    ) : status === 'model-unavailable' ? (
      <>This model is not available right now. Check <code className="rounded bg-white/10 px-1.5 py-0.5">OPENROUTER_MODEL</code> in <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, restart, and try again.</>
    ) : (
      <>A little stardust got tangled. Try gathering this world again.</>
    )

  return (
    <>
      <h1 id="portal-title" className="font-serif text-3xl font-black tracking-[-0.04em] text-white">
        A knot in the stardust.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-amber-50/80">{message}</p>
      {(status === 'error' || status === 'rate-limited') && (
        <button
          type="button"
          onClick={onRetry}
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-amber-100/30 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/20 focus:outline-none focus:ring-4 focus:ring-amber-100/20"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </>
  )
}

function SmileStory({
  signature,
  capsules,
  onClose,
  onBeginAgain,
}: {
  signature: JoySignature
  capsules: JoyCapsule[]
  onClose: () => void
  onBeginAgain: () => void
}) {
  const [shareMessage, setShareMessage] = useState('')
  const [match, setMatch] = useState<SmileMatch | null>(null)
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'error'>('idle')
  const storyText = [
    'MY JOY:D JOURNEY',
    `${signature.wonderTitle} · ${signature.shape} · ${signature.signalPercent}% signal`,
    `${capsules.length} worlds unlocked: ${capsules.map(({ worldName }) => worldName).join(' → ')}`,
    `“${capsules.at(-1)?.quote ?? ''}”`,
    'A small smile opened three impossible places.',
  ].join('\n')

  useEffect(() => {
    saveVoyage(signature, capsules.map(({ worldName }) => worldName))
  }, [capsules, signature])

  const shareStory = async () => {
    const outcome = await shareJoyStoryCard(signature, capsules, storyText)
    setShareMessage(
      outcome === 'shared'
        ? 'Your Joy Story card is ready to travel.'
        : outcome === 'downloaded'
          ? 'Your Joy Story card was saved as an image.'
          : outcome === 'copied'
            ? 'Joy Story copied as text — paste it wherever you share joy.'
            : 'Sharing paused. You can still save this card with a screenshot.',
    )
  }

  const findConnection = async () => {
    setMatchStatus('searching')
    try {
      setMatch(await findSmileMatch(signature))
      playConnectionChime()
      setMatchStatus('idle')
    } catch (error) {
      setMatchStatus('error')
      if (!(error instanceof SmileMatchError)) {
        setShareMessage('The matching constellation needs another moment.')
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#10051f]/96 px-6 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="joy-story-title"
    >
      <motion.article
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-[2rem] border border-amber-100/30 bg-[linear-gradient(145deg,#572a7d,#251244_58%,#182a52)] p-6 text-left shadow-2xl shadow-black/40"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-white/65 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Close Joy Story"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-amber-100/85">
          <Sparkles className="size-4" aria-hidden="true" />
          MY JOY:D JOURNEY
        </p>
        <h2 id="joy-story-title" className="mt-3 max-w-[16rem] font-serif text-4xl font-black tracking-[-0.05em] text-white">
          Three impossible places.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          Your smile became a {signature.shape.toLowerCase()} and opened a small rabbit hole of joy.
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#160a31]/35 p-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-amber-100/75">YOUR SMILE SIGNATURE</p>
            <p className="mt-1 font-serif text-xl font-bold text-white">{signature.wonderTitle}</p>
            <p className="text-sm text-white/65">{signature.shape} · {signature.signalPercent}% signal</p>
          </div>
          <div className="flex -space-x-2" aria-label="Your color trail">
            {signature.colorTrail.map((color) => (
              <span
                key={color}
                className="size-8 rounded-full border-2 border-[#291244] shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <ol className="mt-6 space-y-3">
          {capsules.map((capsule, index) => (
            <li key={capsule.worldName} className="flex gap-3 border-b border-white/10 pb-3 last:border-b-0">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100/15 text-xs font-bold text-amber-100">{index + 1}</span>
              <div>
                <p className="font-serif text-lg font-bold text-white">{capsule.worldName}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{capsule.surprise}</p>
              </div>
            </li>
          ))}
        </ol>

        <blockquote className="mt-5 border-l-2 border-amber-100/65 pl-4 text-sm italic leading-relaxed text-amber-50/95">
          “{capsules.at(-1)?.quote}”
        </blockquote>
        <p className="mt-5 text-center font-serif text-lg font-bold text-amber-50">A small smile opened three impossible places.</p>

        <button
          type="button"
          onClick={() => void shareStory()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-amber-100 px-5 py-3 font-bold text-purple-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/35"
        >
          <Share2 className="size-5" aria-hidden="true" />
          Share my Joy Story
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-white/55">
          {shareMessage || 'Share as text, or save this card as a screenshot.'}
        </p>
        <div className="mt-5 border-t border-white/10 pt-5">
          {match ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-2xl border border-amber-100/35 bg-amber-100/10 p-4 text-center"
            >
              <div className="flex items-center justify-center gap-1" aria-hidden="true">
                <motion.div
                  initial={{ x: -34, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  className="flex items-center gap-1"
                >
                  {signature.colorTrail.map((color) => (
                    <span key={`mine-${color}`} className="size-3.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px 3px ${color}88` }} />
                  ))}
                </motion.div>
                <HeartHandshake className="mx-2 size-7 text-amber-100" aria-hidden="true" />
                <motion.div
                  initial={{ x: 34, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  className="flex items-center gap-1"
                >
                  {(match.matchColorTrail.length ? match.matchColorTrail : ['#f7b7d7', '#a9dfff', '#fff0a8']).map((color, index) => (
                    <span key={`theirs-${color}-${index}`} className="size-3.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px 3px ${color}88` }} />
                  ))}
                </motion.div>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-white">Your smile found another smile.</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-50/85">Two strangers. One {match.sharedShape.toLowerCase()} frequency.</p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-amber-100">{match.similarity}% JOY:D resonance</p>
              <p className="mt-3 text-xs leading-relaxed text-white/50">
                {match.matchSource === 'live'
                  ? 'A live anonymous JOY:D traveler is nearby. No profiles or identities are revealed.'
                  : 'A waiting demo traveler helped awaken this local JOY:D universe.'}
              </p>
              <button
                type="button"
                onClick={onBeginAgain}
                className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-amber-100/45 bg-white/10 px-5 py-2.5 text-sm font-bold text-amber-50 transition hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-amber-100/25"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Begin a new journey
              </button>
              <p className="mt-2 text-xs text-white/45">Every journey starts with a new smile.</p>
            </motion.div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void findConnection()}
                disabled={matchStatus === 'searching'}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-100/45 bg-white/10 px-5 py-3 font-bold text-amber-50 transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-amber-100/25"
              >
                <HeartHandshake className="size-5" aria-hidden="true" />
                {matchStatus === 'searching' ? 'Searching the JOY:D night sky…' : 'Let my smile find another'}
              </button>
              <p className="mt-3 text-center text-xs leading-relaxed text-white/50">
                Only this playful signature is compared. No face, camera frame, name, account, or location is used.
              </p>
              {matchStatus === 'error' && (
                <p className="mt-3 text-center text-xs leading-relaxed text-rose-100/85">The matching constellation needs another moment. Please try again.</p>
              )}
            </>
          )}
        </div>
      </motion.article>
    </motion.div>
  )
}
