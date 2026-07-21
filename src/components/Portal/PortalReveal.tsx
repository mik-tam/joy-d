import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, HeartHandshake, RefreshCw, Share2, Speech, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { bloomLabel, type JoySignature } from '../SmileCamera/createJoySignature'
import type { SmileDetectionStatus } from '../SmileCamera/useSmileDetection'
import {
  generateJoyCapsule,
  JoyCapsuleError,
  type JoyCapsule,
} from '../../data/joyCapsule'
import { findSmileMatch, SmileMatchError, type MatchWorldSummary, type SmileMatch } from '../../data/smileMatch'
import { resolveScene } from '../../data/joyScene'
import { saveVoyage } from '../../data/joyJournal'
import { shareJoyStoryCard } from '../../data/joyStoryCard'
import { generateSceneImages, generateSurpriseImage, type WorldSceneImages } from '../../data/joySceneImages'
import { playConnectionChime, playDiscoveryChime, playHiddenWonderSound, setJoySoundsEnabled, startWorldSoundscape, stopJoySounds, stopWorldSoundscape } from '../../data/joySounds'
import { speakJoyWorld, stopJoyVoice, warmJoyVoices } from '../../data/joyVoice'
import { WorldSecret, WorldStage } from './WorldStage'
import { JoyPrint } from '../JoyPrint'

type PortalRevealProps = {
  onClose: () => void
  signature: JoySignature
  smileScore: number
  smileStatus: SmileDetectionStatus
  wowScore: number
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

export function PortalReveal({ onClose, signature, smileScore, smileStatus, wowScore }: PortalRevealProps) {
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
  const [surpriseImagesByWorld, setSurpriseImagesByWorld] = useState<Record<string, string | null>>({})
  const [imageFailedWorlds, setImageFailedWorlds] = useState<Set<string>>(() => new Set())
  const [visitedWorlds, setVisitedWorlds] = useState<Set<string>>(() => new Set())
  const [phase, setPhase] = useState<PortalPhase>('story')
  const [typedDone, setTypedDone] = useState(false)
  const [skipTyping, setSkipTyping] = useState(false)
  const initialRequestStarted = useRef(false)
  const smileScoreRef = useRef(smileScore)
  const wowScoreRef = useRef(wowScore)
  const chargeStartRef = useRef<number | null>(null)
  const wowHoldRef = useRef<number | null>(null)
  const needsReleaseRef = useRef(false)
  const [wowCharge, setWowCharge] = useState(0)
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
      // Each later door carries the live held smile into its creative cue.
      // This stays a coarse, non-identifying percentage in the browser-to-
      // server payload; frames and landmarks never leave the device.
      const unlockPulse = Math.round(Math.min(Math.max(smileScoreRef.current, 0), 1) * 100)
      const nextCapsule = await generateJoyCapsule(signature, capsules.map(({ worldName }) => worldName), unlockPulse)
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

  useEffect(() => {
    wowScoreRef.current = wowScore
  }, [wowScore])

  // Paint the hidden wonder's form as soon as its world opens, so the WOW
  // reveal is instant.
  useEffect(() => {
    if (phase !== 'world' || !activeCapsule) return
    const { worldName } = activeCapsule
    if (surpriseImagesByWorld[worldName] !== undefined) return
    let cancelled = false
    void generateSurpriseImage(activeCapsule).then((url) => {
      if (cancelled) return
      setSurpriseImagesByWorld((current) =>
        current[worldName] !== undefined ? current : { ...current, [worldName]: url },
      )
    })
    return () => {
      cancelled = true
    }
  }, [phase, activeCapsule, surpriseImagesByWorld])

  // A held "WOW" — an open O-shaped mouth — uncovers the hidden wonder.
  useEffect(() => {
    if (phase !== 'world' || !activeCapsule || storyOpen) return
    if (revealedWorlds.has(activeCapsule.worldName)) return
    const tick = setInterval(() => {
      const wow = wowScoreRef.current
      if (wow >= 0.42) {
        wowHoldRef.current ??= performance.now()
        const progress = Math.min((performance.now() - wowHoldRef.current) / 450, 1)
        setWowCharge(progress)
        if (progress >= 1) {
          wowHoldRef.current = null
          setWowCharge(0)
          revealHiddenWonder()
        }
      } else if (wowHoldRef.current !== null) {
        wowHoldRef.current = null
        setWowCharge(0)
      }
    }, 100)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeCapsule, storyOpen, revealedWorlds])

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
    stopJoyVoice()
  }, [])

  useEffect(() => {
    warmJoyVoices()
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
    stopJoyVoice()
    setIsReading(false)
  }

  const readCapsuleAloud = (capsule: JoyCapsule) => {
    stopReading()
    setIsReading(true)
    speakJoyWorld(capsule, {
      onDone: () => setIsReading(false),
      onError: () => setIsReading(false),
    })
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
      className="fixed inset-0 z-50 isolate flex items-center justify-center overflow-hidden overscroll-none bg-[#0b0518] px-6 py-10"
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

      <AnimatePresence>
        {phase === 'story' && capsuleStatus === 'loading' && !reduceMotion && (
          <motion.div key="warp" exit={{ opacity: 0, transition: { duration: 0.9 } }}>
            <WarpField />
          </motion.div>
        )}
      </AnimatePresence>

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
                <h1 id="portal-title" className="mt-4 font-serif text-4xl font-black leading-[0.94] tracking-[-0.05em] text-white sm:text-5xl">
                  Your smile<br />opened a way in.
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
                  DOOR {discoveryNumber} of 3
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
            className="pointer-events-none absolute inset-x-0 top-14 z-30 mx-auto max-w-2xl px-14 text-center sm:top-12 sm:px-16"
          >
            <p className="text-[10px] font-bold tracking-[0.3em] text-white/70 drop-shadow-[0_1px_6px_rgba(9,4,25,0.8)]">
              DOOR {discoveryNumber} of 3
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
            className="absolute inset-x-0 bottom-16 z-30 flex flex-col items-center gap-2.5 px-6 sm:bottom-6"
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
                    {isDeepening ? (
                      <motion.span
                        animate={reduceMotion ? undefined : { rotate: 360 }}
                        transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
                        className="inline-flex"
                        aria-hidden="true"
                      >
                        <Sparkles className="size-4" />
                      </motion.span>
                    ) : <ArrowRight className="size-4" aria-hidden="true" />}
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
            <p className="hidden text-xs leading-relaxed text-white/45 drop-shadow-[0_1px_6px_rgba(9,4,25,0.8)] sm:block">
              {canGoDeeper
                ? 'A held smile charges the next door · a WOW face reveals the hidden wonder. Tapping works too.'
                : 'One long smile gathers your Joy Story · a WOW face reveals the hidden wonder. Tapping works too.'}
            </p>
          </motion.div>
        </>
      )}

      {phase === 'world' && activeCapsule && (
        <WorldSecret
          capsule={activeCapsule}
          hiddenRevealed={revealedWorlds.has(activeCapsule.worldName)}
          onRevealHidden={revealHiddenWonder}
          wowCharge={wowCharge}
          revealedImage={surpriseImagesByWorld[activeCapsule.worldName]}
        />
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Return to my smile"
        className="absolute left-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-[#160a31]/60 text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 sm:left-5 sm:top-5 sm:size-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Return to my smile</span>
      </button>

      <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={toggleChimes}
          aria-pressed={chimesOn}
          aria-label={chimesOn ? 'World sound on' : 'World sound off'}
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-[#160a31]/60 text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 sm:size-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold"
        >
          {chimesOn ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          <span className="hidden sm:inline">World sound: {chimesOn ? 'On' : 'Off'}</span>
        </button>
        {phase === 'world' && activeCapsule && capsuleStatus === 'ready' && (
          <button
            type="button"
            onClick={() => (isReading ? stopReading() : readCapsuleAloud(activeCapsule))}
            aria-label={isReading ? 'Stop the reading' : 'Hear this world'}
            aria-pressed={isReading}
            className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-[#160a31]/60 text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 sm:size-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold"
          >
            <Speech className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{isReading ? 'Stop reading' : 'Hear this world'}</span>
          </button>
        )}
      </div>

      {/* Compact smile meter on phones; full status card on desktop. */}
      <div
        className="absolute bottom-3 left-3 z-20 flex w-[min(11.5rem,calc(100vw-1.5rem))] items-center gap-2 rounded-full border border-white/15 bg-[#160a31]/75 px-3 py-2 backdrop-blur sm:hidden"
        role="status"
        aria-label={
          smileStatus === 'no-face'
            ? 'Step into view — this world dims without you'
            : smileStatus === 'unavailable' || smileStatus === 'idle'
              ? 'Smile signal resting — tapping works too'
              : 'Your smile is lighting this world'
        }
      >
        <motion.span
          animate={reduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="size-2 shrink-0 rounded-full bg-amber-200"
          style={{ boxShadow: `0 0 ${6 + smileScore * 14}px ${2 + smileScore * 5}px rgba(255,227,151,${0.25 + smileScore * 0.5})` }}
          aria-hidden="true"
        />
        <span className="shrink-0 text-[10px] font-semibold text-white/85">Your smile</span>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200 transition-[width] duration-150"
            style={{ width: `${Math.round(Math.min(smileScore, 1) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-black tabular-nums tracking-[0.06em] text-amber-100/90">
          {Math.round(Math.min(smileScore, 1) * 100)}%
        </span>
      </div>

      <div className="absolute bottom-5 left-5 z-20 hidden max-w-[15rem] items-start gap-3 rounded-2xl border border-white/15 bg-[#160a31]/65 px-4 py-3 backdrop-blur sm:flex">
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
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200 transition-[width] duration-150"
                style={{ width: `${Math.round(Math.min(smileScore, 1) * 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-black tabular-nums tracking-[0.08em] text-amber-100/90">
              {Math.round(Math.min(smileScore, 1) * 100)}%
            </span>
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
            smileScore={smileScore}
            worldImages={sceneImagesByWorld}
            wondersRevealed={revealedWorlds}
            onClose={() => setStoryOpen(false)}
            onBeginAgain={onClose}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const warpStreaks = Array.from({ length: 46 }, (_, index) => ({
  angle: (index / 46) * 360 + ((index * 37) % 13),
  delay: (index % 11) * 0.16,
  duration: 1.05 + (index % 5) * 0.22,
  length: 5 + ((index * 13) % 9),
  color: ['#cfd6ff', '#ffe7a3', '#e6b8ff', '#9ee8df', '#ffffff'][index % 5],
}))

// Streaking starlight rushing past: the wormhole between the doorway and the
// first world.
function WarpField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 90, ease: 'linear', repeat: Infinity }}
        className="absolute inset-0"
      >
        {warpStreaks.map((streak, index) => (
          <div
            key={index}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${streak.angle}deg)` }}
          >
            <motion.span
              initial={{ y: '-4vh', opacity: 0 }}
              animate={{ y: ['-4vh', '-62vh'], opacity: [0, 0.9, 0] }}
              transition={{ duration: streak.duration, repeat: Infinity, delay: streak.delay, ease: 'easeIn' }}
              className="block w-[2.5px] rounded-full"
              style={{
                height: `${streak.length}vh`,
                background: `linear-gradient(to top, transparent, ${streak.color})`,
                boxShadow: `0 0 8px 1px ${streak.color}55`,
              }}
            />
          </div>
        ))}
      </motion.div>
    </div>
  )
}

const emberSparks = Array.from({ length: 24 }, (_, index) => ({
  angle: (index / 24) * 360 + ((index * 53) % 17),
  radius: 202 + ((index * 37) % 52),
  size: 2.5 + (index % 4),
  delay: (index % 7) * 0.23,
  duration: 1.4 + (index % 5) * 0.3,
  color: ['#ffdf8e', '#ffb45e', '#fff3c4', '#ff9a3d'][index % 4],
}))

const blazeSparks = Array.from({ length: 30 }, (_, index) => ({
  angle: (index / 30) * 360 + ((index * 71) % 23),
  radius: 198 + ((index * 43) % 72),
  size: 3 + (index % 5),
  delay: (index % 6) * 0.17,
  duration: 0.9 + (index % 4) * 0.24,
  color: ['#ffdf8e', '#ffb45e', '#ff9a3d', '#fff3c4', '#ffca6b'][index % 5],
}))

function SparkOrbit({
  sparks,
  spinDuration,
  reverse,
  opacity,
}: {
  sparks: typeof emberSparks
  spinDuration: number
  reverse?: boolean
  opacity: number
}) {
  return (
    <motion.div
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: spinDuration, ease: 'linear', repeat: Infinity }}
      className="relative size-[27rem] transition-opacity duration-300 [grid-area:1/1]"
      style={{ opacity }}
    >
      {sparks.map((spark, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2"
          style={{ transform: `rotate(${spark.angle}deg) translateY(-${spark.radius}px)` }}
        >
          <motion.span
            animate={{ opacity: [0.1, 1, 0.1], scale: [0.5, 1.25, 0.5] }}
            transition={{ duration: spark.duration, repeat: Infinity, delay: spark.delay, ease: 'easeInOut' }}
            className="block rounded-full"
            style={{
              width: spark.size,
              height: spark.size,
              background: spark.color,
              boxShadow: `0 0 10px 2px ${spark.color}aa`,
            }}
          />
        </span>
      ))}
    </motion.div>
  )
}

// A slowly turning ring of golden light spitting sparks, Doctor Strange
// style in JOY:D's softer palette. The live smile feeds it: the light spill
// widens, the rim glow deepens, and a faster storm of sparks spins up as the
// smile grows.
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
      {!reduceMotion && (
        <>
          <SparkOrbit sparks={emberSparks} spinDuration={11} opacity={0.55 + glow * 0.45} />
          <SparkOrbit sparks={blazeSparks} spinDuration={3.6} reverse opacity={glow} />
        </>
      )}
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
  const isLocalHost =
    typeof window !== 'undefined'
    && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)

  const message =
    status === 'missing-key' ? (
      isLocalHost ? (
        <>This world needs an AI provider key before it can bloom. Add an OpenAI or OpenRouter key to your local <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, then open the portal again.</>
      ) : (
        <>The world-maker isn’t reachable right now. Please check back again soon.</>
      )
    ) : status === 'quota-exhausted' ? (
      isLocalHost ? (
        <>This OpenAI project has no available API quota. Add credits, raise the project budget, or use an OpenRouter key instead.</>
      ) : (
        <>The world-maker has run out of steam for the moment. Please check back again soon.</>
      )
    ) : status === 'service-offline' ? (
      isLocalHost ? (
        <>The local JOY:D capsule service is not running. Stop the old dev server and restart this project with <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>.</>
      ) : (
        <>JOY:D couldn’t reach its world-making service. Please try again in a moment.</>
      )
    ) : status === 'auth-failed' ? (
      isLocalHost ? (
        <>JOY:D can reach the AI provider, but it cannot verify the key. Check the key in <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, then restart <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>.</>
      ) : (
        <>JOY:D can’t verify its connection to the world-maker right now. Please try again shortly.</>
      )
    ) : status === 'rate-limited' ? (
      <>The world-maker is busy right now. Wait a moment, then try gathering this world again.</>
    ) : status === 'model-unavailable' ? (
      isLocalHost ? (
        <>This model is not available right now. Check <code className="rounded bg-white/10 px-1.5 py-0.5">OPENROUTER_MODEL</code> in <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, restart, and try again.</>
      ) : (
        <>The world-maker is taking a breather. Please try again in a moment.</>
      )
    ) : (
      <>A little stardust got tangled. Try gathering this world again.</>
    )

  return (
    <>
      <h1 id="portal-title" className="font-serif text-3xl font-black tracking-[-0.04em] text-white">
        A knot in the stardust.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-amber-50/80">{message}</p>
      {(status === 'error' || status === 'rate-limited' || status === 'auth-failed' || status === 'model-unavailable') && (
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


// ---------------------------------------------------------------------------
// The finale: a cosmic, Wrapped-style recap of the whole Joyventure, ending in
// a smile-triggered meeting with another traveler. Set against the dark
// universe to mark the departure from the discovered worlds.
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const worldFallbackGradients = [
  'from-[#3b1d63] via-[#5b2f7e] to-[#a066a6]',
  'from-[#0e4a5f] via-[#116b73] to-[#53b9b7]',
  'from-[#7a2f56] via-[#c65b62] to-[#f5a24f]',
]

const cosmicStars = Array.from({ length: 96 }, (_, index) => {
  const sample = (multiplier: number, offset: number) => ((index * multiplier + offset) % 997) / 997
  return {
    left: `${(sample(173, 59) * 98 + 1).toFixed(2)}%`,
    top: `${(sample(419, 137) * 96 + 2).toFixed(2)}%`,
    size: 1 + sample(277, 211) * 2.7,
    opacity: 0.22 + sample(331, 307) * 0.7,
    delay: sample(487, 89) * -6,
    duration: 2.8 + sample(613, 401) * 4.8,
    color: ['#ffffff', '#fff0bc', '#dfe5ff', '#efccff'][index % 4],
  }
})

function CosmicBackdrop({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#22143f_0%,#130b28_55%,#080414_100%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {cosmicStars.map((star, index) => (
          <motion.span
            key={index}
            animate={reduceMotion ? undefined : { opacity: [star.opacity * 0.35, star.opacity, star.opacity * 0.45], scale: [0.75, 1.25, 0.85] }}
            transition={{ duration: star.duration, repeat: Infinity, repeatType: 'mirror', delay: star.delay, ease: 'easeInOut' }}
            className="absolute rounded-full"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              backgroundColor: star.color,
              boxShadow: star.size > 2.5 ? `0 0 ${star.size * 3}px ${star.color}88` : undefined,
            }}
          />
        ))}
      </div>
      {!reduceMotion && (
        <motion.div
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(190,140,255,0.16)_0%,transparent_65%)] blur-2xl"
          aria-hidden="true"
        />
      )}
    </>
  )
}

function TrailComet({ colors, className, reverse }: { colors: string[]; className?: string; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${reverse ? 'flex-row-reverse' : ''} ${className ?? ''}`}>
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className="rounded-full"
          style={{
            width: 22 - index * 5,
            height: 22 - index * 5,
            backgroundColor: color,
            boxShadow: `0 0 ${18 - index * 4}px ${6 - index}px ${color}bb`,
          }}
        />
      ))}
    </div>
  )
}

function StoryStat({ label, value, percent }: { label: string; value: string; percent: number }) {
  const [displayPercent, setDisplayPercent] = useState(0)
  const displayPercentRef = useRef(0)
  const clampedPercent = Math.min(Math.max(percent, 4), 100)

  useEffect(() => {
    const startValue = displayPercentRef.current
    const startedAt = performance.now()
    const duration = 1000
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      const nextValue = Math.round(startValue + (clampedPercent - startValue) * eased)
      displayPercentRef.current = nextValue
      setDisplayPercent(nextValue)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clampedPercent])

  const rollingValue = value.endsWith('%') ? `${displayPercent}%` : value

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-left text-[11px] font-bold tracking-[0.16em] text-amber-100/70">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200"
        />
      </div>
      <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-white/85">{rollingValue}</span>
    </div>
  )
}

const meetSparks = Array.from({ length: 30 }, (_, index) => ({
  angle: (index / 30) * Math.PI * 2 + ((index * 31) % 9) / 9,
  distance: 90 + ((index * 47) % 170),
  size: 3 + ((index * 13) % 4),
  delay: ((index * 7) % 6) * 0.06,
  color: ['#ffdf8e', '#f5a9c6', '#a9dfff', '#fff3c4', '#c7adff'][index % 5],
}))

function MeetBurst() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10" aria-hidden="true">
      {meetSparks.map((spark, index) => (
        <motion.span
          key={index}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{
            x: Math.cos(spark.angle) * spark.distance,
            y: Math.sin(spark.angle) * spark.distance,
            opacity: [1, 1, 0],
            scale: [0.4, 1.2, 0.5],
          }}
          transition={{ duration: 1.3, delay: 0.5 + spark.delay, ease: 'easeOut' }}
          className="absolute rounded-full"
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

const spriteMarks: Record<string, string> = {
  'lantern-boat': '◈',
  'crescent-moon': '☾',
  'garden-door': '⌂',
  cloud: '◌',
  wave: '〰',
  star: '✦',
}

function TravelerFlipCard({
  label,
  signature,
  worlds,
  worldImages,
  reduceMotion,
}: {
  label: string
  signature: JoySignature
  worlds: MatchWorldSummary[]
  worldImages?: Record<string, WorldSceneImages>
  reduceMotion: boolean
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <button
      type="button"
      onClick={() => setFlipped((current) => !current)}
      aria-pressed={flipped}
      aria-label={flipped ? `${label}: show signature` : `${label}: show three worlds`}
      className="group relative h-[19.5rem] w-full [perspective:1100px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/50"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: 'easeInOut' }}
        className="relative h-full w-full [transform-style:preserve-3d]"
      >
        {/* Signature composition side (shown first). */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#160a31]/80 p-3 text-left shadow-xl backdrop-blur-md [backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-bold tracking-[0.16em] text-amber-100/75">{label}</p>
            <p className="shrink-0 text-[10px] font-bold tracking-wider text-amber-100">{signature.momentCode}</p>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <JoyPrint signature={signature} className="size-11 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-black leading-tight text-white">{signature.wonderTitle}</p>
              <p className="text-[10px] text-white/55">{signature.shape}</p>
            </div>
          </div>
          <div className="mt-3 grid flex-1 gap-1.5">
            <StoryStat label="BRIGHTNESS" value={`${signature.signalPercent}%`} percent={signature.signalPercent} />
            <StoryStat label="HOLD" value={`${(signature.heldForMs / 1000).toFixed(1)}s`} percent={(signature.heldForMs / 4000) * 100} />
            <StoryStat label="BLOOM" value={bloomLabel(signature.riseRate)} percent={(signature.riseRate / 1) * 100} />
          </div>
          <p className="mt-2 text-center text-[9px] text-white/35">tap to see worlds</p>
        </div>

        {/* Worlds side. */}
        <div className="absolute inset-0 flex rotate-y-180 flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#160a31]/80 p-3 text-left shadow-xl backdrop-blur-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-[9px] font-bold tracking-[0.16em] text-amber-100/75">{label} · 3 WORLDS</p>
          <ol className="mt-2 grid min-h-0 flex-1 gap-2 overflow-y-auto">
            {worlds.slice(0, 3).map((world, index) => {
              const image = worldImages?.[world.worldName]?.elements.find(Boolean) ?? null
              const mark = spriteMarks[world.sprite ?? ''] ?? '✦'
              return (
                <li key={`${world.worldName}-${index}`} className="flex items-center gap-2">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {image ? (
                      <img src={image} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <span className="grid h-full place-items-center text-base text-amber-100/80" aria-hidden="true">
                        {mark}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-serif text-[11px] font-black leading-tight text-white">{world.worldName}</p>
                    <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-white/45">“{world.quote}”</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="mt-1 text-center text-[9px] text-white/35">tap to see signature</p>
        </div>
      </motion.div>
    </button>
  )
}

function SmileStory({
  signature,
  capsules,
  smileScore,
  worldImages,
  wondersRevealed,
  onClose,
  onBeginAgain,
}: {
  signature: JoySignature
  capsules: JoyCapsule[]
  smileScore: number
  worldImages: Record<string, WorldSceneImages>
  wondersRevealed: Set<string>
  onClose: () => void
  onBeginAgain: () => void
}) {
  const reduceMotion = useReducedMotion()
  const [chapter, setChapter] = useState(0)
  const [match, setMatch] = useState<SmileMatch | null>(null)
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'waiting' | 'error'>('idle')
  const [smileCharge, setSmileCharge] = useState(0)
  const [shareMessage, setShareMessage] = useState('')
  const smileScoreRef = useRef(smileScore)
  const chargeStartRef = useRef<number | null>(null)
  const searchStartedRef = useRef(false)

  const chapterCount = 4
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

  useEffect(() => {
    smileScoreRef.current = smileScore
  }, [smileScore])

  const findConnection = useCallback(async () => {
    if (searchStartedRef.current) return
    searchStartedRef.current = true
    setMatchStatus('searching')
    try {
      const [result] = await Promise.all([
        findSmileMatch(
          signature,
          capsules.map((capsule) => {
            const scene = resolveScene(capsule)
            const sprite =
              scene.elements.find((element) => element.sprite !== 'garden-door')?.sprite
              ?? scene.elements[0]?.sprite
            return {
              quote: capsule.quote,
              worldName: capsule.worldName,
              ...(sprite ? { sprite } : {}),
            } satisfies MatchWorldSummary
          }),
        ),
        delay(reduceMotion ? 300 : 1800),
      ])
      if (result.matchSource === 'waiting') {
        setMatchStatus('waiting')
      } else {
        setMatch(result)
        playConnectionChime()
        setMatchStatus('idle')
      }
    } catch (error) {
      searchStartedRef.current = false
      setMatchStatus('error')
      if (error instanceof SmileMatchError) {
        setShareMessage(error.message)
      } else {
        setShareMessage('The matching constellation needs another moment.')
      }
    }
  }, [capsules, reduceMotion, signature])

  // On the final chapter, a held smile reaches across the dark to find another
  // traveler. The camera is still watching from inside the portal.
  useEffect(() => {
    if (chapter !== 3 || match || matchStatus === 'searching' || matchStatus === 'waiting') return
    const tick = setInterval(() => {
      const score = smileScoreRef.current
      if (score >= 0.42) {
        chargeStartRef.current ??= performance.now()
        const progress = Math.min((performance.now() - chargeStartRef.current) / 1300, 1)
        setSmileCharge(progress)
        if (progress >= 1) {
          chargeStartRef.current = null
          setSmileCharge(0)
          void findConnection()
        }
      } else if (chargeStartRef.current !== null) {
        chargeStartRef.current = null
        setSmileCharge(0)
      }
    }, 100)
    return () => clearInterval(tick)
  }, [chapter, match, matchStatus, findConnection])

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

  const otherSignature: JoySignature | null = match?.matchSource === 'live'
    ? match.matchSignature
      ? {
          colorTrail: match.matchSignature.colorTrail,
          creativeSeed: (match.similarity ?? 0) * 97,
          heldForMs: match.matchSignature.heldForMs,
          momentCode: match.matchSignature.momentCode,
          riseRate: match.matchSignature.riseRate,
          shape: match.matchSignature.shape,
          signalPercent: match.matchSignature.signalPercent,
          wonderTitle: match.matchSignature.wonderTitle,
        }
      : {
          colorTrail: ((match.matchColorTrail?.length ?? 0) >= 3
            ? match.matchColorTrail!.slice(0, 3)
            : ['#f7b7d7', '#a9dfff', '#fff0a8']) as [string, string, string],
          creativeSeed: (match.similarity ?? 0) * 97,
          heldForMs: 700 + (match.similarity ?? 0) * 7,
          momentCode: `JOY-${(match.sharedShape ?? 'JOY').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}${match.similarity ?? 0}`,
          riseRate: 0.4,
          shape: match.sharedShape ?? 'Gentle Bloom',
          signalPercent: match.similarity ?? 0,
          wonderTitle: 'A fellow traveler',
        }
    : null

  const chapters = ['Journey', 'Worlds', 'Signature', 'Connection']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#080414]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="joy-story-title"
    >
      <CosmicBackdrop reduceMotion={Boolean(reduceMotion)} />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-30 rounded-full border border-white/15 bg-white/5 p-2 text-white/65 backdrop-blur transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
        aria-label="Close and return to the worlds"
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      {/* Chapter progress, Wrapped-style. */}
      <div className="relative z-20 flex items-center justify-center gap-1.5 px-6 pt-5">
        {chapters.map((name, index) => (
          <div key={name} className="h-1 flex-1 max-w-[5rem] overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-amber-100 transition-[width] duration-500"
              style={{ width: index < chapter ? '100%' : index === chapter ? '100%' : '0%', opacity: index <= chapter ? 1 : 0.3 }}
            />
          </div>
        ))}
      </div>

      <div className={`relative z-10 flex flex-1 items-center justify-center overflow-y-auto py-4 ${chapter === 1 ? 'px-0' : 'px-6'}`}>
        <AnimatePresence mode="wait">
          {/* ---------------------------------------------------------------- */}
          {chapter === 0 && (
            <motion.section
              key="ch-intro"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex w-full max-w-md flex-col items-center text-center"
            >
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-amber-100/80">
                <Sparkles className="size-4" aria-hidden="true" />
                YOUR JOYVENTURE
              </p>
              <motion.div
                initial={reduceMotion ? false : { rotate: -30, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                className="my-6"
              >
                <JoyPrint signature={signature} className="size-32 drop-shadow-[0_0_30px_rgba(255,231,163,0.35)]" />
              </motion.div>
              <h2 id="joy-story-title" className="font-serif text-5xl font-black leading-[0.95] tracking-[-0.04em] text-white">
                Three impossible<br />places.
              </h2>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">
                Your smile became a {signature.shape.toLowerCase()} and opened a small rabbit hole of joy.
              </p>
              <TrailComet colors={signature.colorTrail} className="mt-6" />
            </motion.section>
          )}

          {/* ---------------------------------------------------------------- */}
          {chapter === 1 && (
            <motion.section
              key="ch-worlds"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex w-full max-w-none flex-col items-center"
            >
              <p className="px-6 text-xs font-bold tracking-[0.3em] text-amber-100/80">THE PLACES YOUR SMILE OPENED</p>
              <div className="mt-6 flex w-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:justify-center sm:gap-4 sm:px-6">
                {capsules.map((capsule, index) => {
                  const images = worldImages[capsule.worldName]
                  const sprite = images?.elements.find(Boolean) ?? null
                  const found = wondersRevealed.has(capsule.worldName)
                  return (
                    <motion.article
                      key={capsule.worldName}
                      initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.15 + index * 0.16, duration: 0.55, ease: 'easeOut' }}
                      className={`relative flex aspect-[3/4] w-[min(78vw,16rem)] shrink-0 snap-center flex-col justify-end overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br ${worldFallbackGradients[index % 3]} shadow-2xl shadow-black/50 sm:w-[min(66vw,14rem)]`}
                    >
                      {images?.backdrop && (
                        <img src={images.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      {sprite && (
                        <motion.img
                          src={sprite}
                          alt=""
                          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
                          transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute left-1/2 top-[14%] w-[46%] -translate-x-1/2 object-contain drop-shadow-[0_10px_20px_rgba(9,4,25,0.5)]"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#080414]/92 via-[#080414]/45 to-transparent" />
                      <div className="relative p-4">
                        <p className="text-[10px] font-bold tracking-[0.2em] text-amber-100/80">DOOR {index + 1}</p>
                        <h3 className="mt-1 font-serif text-lg font-black leading-tight text-white">{capsule.worldName}</h3>
                        {found ? (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-100">
                            <Sparkles className="size-3" aria-hidden="true" /> wonder found
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-white/50">a wonder stayed hidden</p>
                        )}
                      </div>
                    </motion.article>
                  )
                })}
              </div>
              <p className="mt-5 px-6 text-center text-sm text-white/60">
                {wondersRevealed.size === capsules.length
                  ? 'You uncovered every hidden wonder. ✦'
                  : `${wondersRevealed.size} of ${capsules.length} hidden wonders uncovered.`}
              </p>
            </motion.section>
          )}

          {/* ---------------------------------------------------------------- */}
          {chapter === 2 && (
            <motion.section
              key="ch-signature"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex w-full max-w-md flex-col items-center text-center"
            >
              <p className="text-xs font-bold tracking-[0.3em] text-amber-100/80">YOUR SMILE SIGNATURE</p>
              <motion.div
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 60, ease: 'linear', repeat: Infinity }}
                className="my-5"
              >
                <JoyPrint signature={signature} className="size-28 drop-shadow-[0_0_26px_rgba(255,231,163,0.35)]" />
              </motion.div>
              <h2 className="font-serif text-3xl font-black leading-tight tracking-[-0.03em] text-white">{signature.wonderTitle}</h2>
              <p className="mt-1 text-sm text-white/60">{signature.shape} · {signature.momentCode}</p>
              <div className="mt-6 grid w-full gap-3 rounded-2xl border border-white/12 bg-white/5 p-4">
                <StoryStat label="BRIGHTNESS" value={`${signature.signalPercent}%`} percent={signature.signalPercent} />
                <StoryStat label="HOLD" value={`${(signature.heldForMs / 1000).toFixed(1)}s`} percent={(signature.heldForMs / 4000) * 100} />
                <StoryStat label="BLOOM" value={bloomLabel(signature.riseRate)} percent={(signature.riseRate / 1) * 100} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-white/45">
                This exact smile will never happen again. Its print belongs to this moment alone.
              </p>
              <button
                type="button"
                onClick={() => void shareStory()}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-100/40 bg-amber-100/10 px-5 py-2.5 text-sm font-bold text-amber-50 transition hover:bg-amber-100/20 focus:outline-none focus:ring-4 focus:ring-amber-100/25"
              >
                <Share2 className="size-4" aria-hidden="true" />
                Share my Joy Story
              </button>
              {shareMessage && <p className="mt-2 text-xs text-white/50">{shareMessage}</p>}
            </motion.section>
          )}

          {/* ---------------------------------------------------------------- */}
          {chapter === 3 && (
            <motion.section
              key="ch-connection"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex w-full max-w-md flex-col items-center text-center"
            >
              {match && otherSignature ? (
                <div className="relative flex w-full flex-col items-center">
                  {!reduceMotion && <MeetBurst />}
                  <div className="relative z-20 flex items-center justify-center gap-4">
                    <motion.div
                      initial={reduceMotion ? false : { x: -70, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 1.1, ease: 'easeOut' }}
                    >
                      <JoyPrint signature={signature} className="size-24 drop-shadow-[0_0_22px_rgba(255,231,163,0.4)]" />
                    </motion.div>
                    <motion.div
                      initial={reduceMotion ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, duration: 0.5, ease: 'backOut' }}
                    >
                      <HeartHandshake className="size-8 text-amber-100" aria-hidden="true" />
                    </motion.div>
                    <motion.div
                      initial={reduceMotion ? false : { x: 70, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 1.1, ease: 'easeOut' }}
                    >
                      <JoyPrint signature={otherSignature} className="size-24 drop-shadow-[0_0_22px_rgba(169,223,255,0.4)]" />
                    </motion.div>
                  </div>
                  <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="mt-7 font-serif text-4xl font-black leading-tight tracking-[-0.03em] text-white"
                  >
                    Your smile found<br />another smile.
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                    className="mt-3 text-sm text-white/70"
                  >
                    Two strangers. One {(match.sharedShape ?? 'gentle bloom').toLowerCase()} frequency.
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="mt-4 font-serif text-5xl font-black text-amber-100"
                  >
                    {match.similarity ?? 0}%
                  </motion.p>
                  <p className="text-xs font-semibold tracking-[0.2em] text-amber-100/70">JOY:D RESONANCE</p>
                  <div className="mt-5 grid w-full max-w-lg grid-cols-2 gap-2.5 sm:gap-3">
                    <TravelerFlipCard
                      label="YOU"
                      signature={signature}
                      worlds={capsules.map((capsule) => {
                        const scene = resolveScene(capsule)
                        const sprite =
                          scene.elements.find((element) => element.sprite !== 'garden-door')?.sprite
                          ?? scene.elements[0]?.sprite
                        return {
                          quote: capsule.quote,
                          worldName: capsule.worldName,
                          ...(sprite ? { sprite } : {}),
                        }
                      })}
                      worldImages={worldImages}
                      reduceMotion={Boolean(reduceMotion)}
                    />
                    <TravelerFlipCard
                      label="THEM"
                      signature={otherSignature}
                      worlds={match.matchWorlds ?? []}
                      reduceMotion={Boolean(reduceMotion)}
                    />
                  </div>
                  <p className="mt-3 text-[10px] text-white/40">Tap a card to flip between signatures and worlds.</p>
                  <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/45">
                    A real anonymous traveler. Only your playful signature and AI-generated world summaries met here—never either person’s identity.
                  </p>
                  <button
                    type="button"
                    onClick={onBeginAgain}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-6 py-3 text-sm font-bold text-purple-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/30"
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Begin a new journey
                  </button>
                  <p className="mt-2 text-xs text-white/40">Every journey starts with a new smile.</p>
                </div>
              ) : matchStatus === 'searching' ? (
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={reduceMotion ? undefined : { rotate: 360 }}
                    transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
                    className="relative size-40"
                  >
                    {[...Array(9)].map((_, index) => (
                      <motion.span
                        key={index}
                        animate={reduceMotion ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.6, 1.2, 0.6] }}
                        transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.2 }}
                        className="absolute size-2 rounded-full bg-amber-100 shadow-[0_0_12px_3px_rgba(255,227,151,0.6)]"
                        style={{
                          left: `${50 + Math.cos((index / 9) * Math.PI * 2) * 42}%`,
                          top: `${50 + Math.sin((index / 9) * Math.PI * 2) * 42}%`,
                        }}
                      />
                    ))}
                  </motion.div>
                  <p className="mt-6 font-serif text-2xl font-black text-white">Reaching across the dark…</p>
                  <p className="mt-2 text-sm text-white/60">Searching the JOY:D night sky.</p>
                </div>
              ) : matchStatus === 'waiting' ? (
                <div className="flex max-w-sm flex-col items-center">
                  <TrailComet colors={signature.colorTrail} className="mb-6" />
                  <h2 className="font-serif text-4xl font-black leading-tight tracking-[-0.03em] text-white">
                    Your smile is<br />waiting to meet another.
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/70">
                    There is no live match yet. Your anonymous signature and three AI-generated worlds will wait for up to seven days.
                  </p>
                  <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/45">
                    No face, camera frame, name, account, or location is stored. A future traveler can meet the worlds your smile opened.
                  </p>
                  <button
                    type="button"
                    onClick={onBeginAgain}
                    className="mt-7 inline-flex items-center gap-2 rounded-full bg-amber-100 px-6 py-3 text-sm font-bold text-purple-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/30"
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Begin a new journey
                  </button>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center">
                  <p className="text-xs font-bold tracking-[0.3em] text-amber-100/80">ONE SMILE LEFT TO GIVE</p>
                  <TrailComet colors={signature.colorTrail} className="my-6" />
                  <h2 className="font-serif text-4xl font-black leading-tight tracking-[-0.03em] text-white">
                    Let your smile<br />find another.
                  </h2>
                  <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
                    Somewhere out there, another smile made a {signature.shape.toLowerCase()} too. Smile again to reach them.
                  </p>
                  <div className="mt-7 w-full max-w-xs">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200 transition-[width] duration-150"
                        style={{ width: `${Math.round(Math.max(smileCharge, Math.min(smileScore, 1) * 0.4) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-amber-100/80">
                      {smileCharge > 0 ? 'Your smile is reaching out…' : 'Smile to reach across the dark'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void findConnection()}
                    className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline focus:outline-none"
                  >
                    or tap to find another
                  </button>
                  <p className="mt-5 max-w-xs text-[11px] leading-relaxed text-white/40">
                    By continuing, you opt in to share this playful signature and your three AI-generated world summaries for up to seven days. No face, camera frame, name, account, or location is used.
                  </p>
                  {matchStatus === 'error' && (
                    <p className="mt-3 text-xs text-rose-100/85">
                      {shareMessage || 'The matching constellation needs another moment. Please try again.'}
                    </p>
                  )}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation — hidden on the connection chapter once matching begins. */}
      {!(chapter === 3 && (match || matchStatus === 'searching' || matchStatus === 'waiting')) && (
        <div className="relative z-20 flex items-center justify-between px-6 pb-7">
          <button
            type="button"
            onClick={() => (chapter === 0 ? onClose() : setChapter((c) => c - 1))}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-white/55 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {chapter === 0 ? 'Back' : 'Prev'}
          </button>
          {chapter < chapterCount - 1 ? (
            <button
              type="button"
              onClick={() => setChapter((c) => c + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-6 py-3 text-sm font-bold text-purple-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/30"
            >
              {chapter === 2 ? 'Match my smile' : 'Next'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <span className="w-16" />
          )}
        </div>
      )}
    </motion.div>
  )
}
