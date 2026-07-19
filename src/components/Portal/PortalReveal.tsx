import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, HeartHandshake, RefreshCw, Share2, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { JoySignature } from '../SmileCamera/createJoySignature'
import {
  generateJoyCapsule,
  JoyCapsuleError,
  type JoyCapsule,
} from '../../data/joyCapsule'
import { findSmileMatch, SmileMatchError, type SmileMatch } from '../../data/smileMatch'
import { playConnectionChime, playDiscoveryChime, playHiddenWonderSound, setJoySoundsEnabled, startWorldSoundscape, stopJoySounds, stopWorldSoundscape } from '../../data/joySounds'
import { WorldSecret, WorldStage } from './WorldStage'

type PortalRevealProps = {
  onClose: () => void
  signature: JoySignature
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

export function PortalReveal({ onClose, signature }: PortalRevealProps) {
  const reduceMotion = useReducedMotion()
  const [capsules, setCapsules] = useState<JoyCapsule[]>([])
  const [activeCapsuleIndex, setActiveCapsuleIndex] = useState(0)
  const [capsuleStatus, setCapsuleStatus] = useState<CapsuleStatus>('loading')
  const [isDeepening, setIsDeepening] = useState(false)
  const [deepeningError, setDeepeningError] = useState<string | null>(null)
  const [storyOpen, setStoryOpen] = useState(false)
  const [chimesOn, setChimesOn] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [revealedWorlds, setRevealedWorlds] = useState<Set<string>>(() => new Set())
  const initialRequestStarted = useRef(false)
  const travel = reduceMotion ? 24 : 1300
  const duration = reduceMotion ? 0.2 : 0.95
  const activeCapsule = capsules[activeCapsuleIndex] ?? null

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
        setDeepeningError('The free world-maker is busy. Give it a moment, then follow the glimmer again.')
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

  useEffect(() => () => {
    stopJoySounds()
    window.speechSynthesis?.cancel()
  }, [])

  useEffect(() => {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 isolate flex items-center justify-center overflow-hidden bg-[#10051f] px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,197,132,0.32),transparent_18%),radial-gradient(circle_at_26%_70%,rgba(185,162,255,0.24),transparent_34%),radial-gradient(circle_at_77%_24%,rgba(130,233,210,0.18),transparent_30%)]" />
      <div className="joy-paper-grain absolute inset-0" aria-hidden="true" />
      <AnimatePresence mode="wait">
        {activeCapsule && (
          <WorldStage
            capsule={activeCapsule}
          />
        )}
      </AnimatePresence>
      {activeCapsule && (
        <WorldSecret
          capsule={activeCapsule}
          hiddenRevealed={revealedWorlds.has(activeCapsule.worldName)}
          onRevealHidden={revealHiddenWonder}
        />
      )}
      <button
        type="button"
        onClick={toggleChimes}
        aria-pressed={chimesOn}
        className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#160a31]/60 px-3 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        {chimesOn ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
        World sound: {chimesOn ? 'On' : 'Off'}
      </button>

      <motion.div
        initial={{ opacity: 0.3, scale: 0.45 }}
        animate={{ opacity: [0.45, 0.9, 0.72], scale: [0.45, 1.15, 1] }}
        transition={{ delay: reduceMotion ? 0 : 0.32, duration: reduceMotion ? 0.2 : 1.2, ease: 'easeOut' }}
        className="absolute size-[22rem] rounded-full bg-[radial-gradient(circle,rgba(255,247,203,0.95)_0%,rgba(255,190,136,0.72)_18%,rgba(215,163,255,0.5)_42%,rgba(105,229,212,0.18)_63%,transparent_72%)] blur-[1px]"
        aria-hidden="true"
      />
      <motion.div
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
        className="absolute size-[26rem] rounded-full border border-amber-100/25"
        aria-hidden="true"
      />
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

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0.2 : 0.95, duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 mx-auto flex max-h-full w-full max-w-md flex-col items-center overflow-y-auto py-8 text-center"
      >
        <p className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.28em] text-amber-100/85">
          <Sparkles className="size-4" aria-hidden="true" />
          THE FIRST LITTLE DOOR
        </p>
        <h1 id="portal-title" className="mt-4 font-serif text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
          Your smile opened a way in.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-white/75">
          A new JOY:D world is gathering just beyond this glow. Its colours carry your {signature.shape.toLowerCase()}.
        </p>
        <JoyCapsuleMoment
          capsule={activeCapsule}
          status={capsuleStatus}
          discoveryNumber={activeCapsuleIndex + 1}
          discoveryCount={capsules.length}
          isDeepening={isDeepening}
          deepeningError={deepeningError}
          canGoDeeper={capsules.length < 3}
          onRetry={() => void gatherFirstWorld()}
          onGoDeeper={() => void goDeeper()}
          onSelectDiscovery={(index) => {
            stopReading()
            setActiveCapsuleIndex(index)
          }}
          onOpenStory={() => setStoryOpen(true)}
          onReadAloud={() => activeCapsule && readCapsuleAloud(activeCapsule)}
          isReading={isReading}
          hiddenRevealed={activeCapsule ? revealedWorlds.has(activeCapsule.worldName) : false}
        />
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-6 flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to my smile
        </button>
      </motion.section>
      <AnimatePresence>
        {storyOpen && capsules.length === 3 && (
          <SmileStory
            signature={signature}
            capsules={capsules}
            onClose={() => setStoryOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function JoyCapsuleMoment({
  capsule,
  status,
  discoveryNumber,
  discoveryCount,
  isDeepening,
  deepeningError,
  canGoDeeper,
  onRetry,
  onGoDeeper,
  onSelectDiscovery,
  onOpenStory,
  onReadAloud,
  isReading,
  hiddenRevealed,
}: {
  capsule: JoyCapsule | null
  status: CapsuleStatus
  discoveryNumber: number
  discoveryCount: number
  isDeepening: boolean
  deepeningError: string | null
  canGoDeeper: boolean
  onRetry: () => void
  onGoDeeper: () => void
  onSelectDiscovery: (index: number) => void
  onOpenStory: () => void
  onReadAloud: () => void
  isReading: boolean
  hiddenRevealed: boolean
}) {
  if (status === 'loading') {
    return (
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-100/20 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
          className="size-3 rounded-full border-2 border-amber-100/30 border-t-amber-100"
        />
        World gathering…
      </div>
    )
  }

  if (status === 'missing-key') {
    return (
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-amber-100/20 bg-purple-950/35 p-4 text-sm leading-relaxed text-amber-50/80">
        This world needs an AI provider key before it can bloom. Add an OpenAI or OpenRouter key to your local <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, then open the portal again.
      </div>
    )
  }

  if (status === 'quota-exhausted') {
    return (
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-amber-100/20 bg-purple-950/35 p-4 text-sm leading-relaxed text-amber-50/80">
        This OpenAI project has no available API quota. Add credits, raise the project budget, or use an OpenRouter key instead.
      </div>
    )
  }

  if (status === 'service-offline') {
    return (
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-amber-100/20 bg-purple-950/35 p-4 text-sm leading-relaxed text-amber-50/80">
        The local JOY:D capsule service is not running. Stop the old dev server and restart this project with <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>.
      </div>
    )
  }

  if (status === 'auth-failed') {
    return (
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-amber-100/20 bg-purple-950/35 p-4 text-sm leading-relaxed text-amber-50/80">
        JOY:D can reach OpenRouter, but it cannot verify the key. Check that <code className="rounded bg-white/10 px-1.5 py-0.5">OPENROUTER_API_KEY</code> is complete, then restart <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>.
      </div>
    )
  }

  if (status === 'rate-limited') {
    return (
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-amber-100/20 bg-purple-950/35 p-4 text-sm leading-relaxed text-amber-50/80">
        The free world-maker is busy right now. Wait a moment, then try gathering this world again.
      </div>
    )
  }

  if (status === 'model-unavailable') {
    return (
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-amber-100/20 bg-purple-950/35 p-4 text-sm leading-relaxed text-amber-50/80">
        This OpenRouter model is not available right now. Set <code className="rounded bg-white/10 px-1.5 py-0.5">OPENROUTER_MODEL=openrouter/free</code> in <code className="rounded bg-white/10 px-1.5 py-0.5">.env</code>, restart, and try again.
      </div>
    )
  }

  if (status === 'error' || !capsule) {
    return (
      <div className="mt-6">
        <p className="text-sm text-amber-50/80">A little stardust got tangled. Try gathering this world again.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-amber-100/30 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/20 focus:outline-none focus:ring-4 focus:ring-amber-100/20"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="joy-paper-card mx-auto mt-6 max-w-sm rounded-3xl border border-amber-100/35 bg-[linear-gradient(145deg,rgba(70,42,107,0.9),rgba(35,18,68,0.88)_65%,rgba(15,62,81,0.82))] p-5 text-left shadow-[0_18px_45px_rgba(9,4,25,0.42)]"
    >
      <div className="flex items-center justify-between gap-3 text-xs font-bold tracking-[0.18em] text-amber-100/80">
        <span>{discoveryNumber === 1 ? 'YOUR FIRST JOY CAPSULE' : `DISCOVERY ${discoveryNumber}`}</span>
        <span className="tracking-normal text-white/55">{discoveryNumber} / {Math.max(discoveryCount, 1)}</span>
      </div>
      <h2 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-white">{capsule.worldName}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/75">{capsule.story}</p>
      <blockquote className="mt-4 border-l-2 border-amber-100/55 pl-3 text-sm italic text-amber-50/90">“{capsule.quote}”</blockquote>
      <button
        type="button"
        onClick={onReadAloud}
        disabled={isReading}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-amber-50 transition hover:bg-white/20 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-100/50"
      >
        <Volume2 className="size-3.5" aria-hidden="true" />
        {isReading ? 'The world is speaking…' : 'Hear this world'}
      </button>
      <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs text-white/65">
        <p><span className="font-bold text-amber-100/80">LOOK:</span> {capsule.visualDirection}</p>
        <p><span className="font-bold text-amber-100/80">SOUND:</span> {capsule.soundMood}</p>
        <p>
          <span className="font-bold text-amber-100/80">HIDDEN THING:</span>{' '}
          {hiddenRevealed ? capsule.surprise : 'A sparkling secret has slipped into the world. Find it in the scene.'}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: discoveryCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelectDiscovery(index)}
              className={`size-2.5 rounded-full transition focus:outline-none focus:ring-2 focus:ring-amber-100/60 ${index + 1 === discoveryNumber ? 'bg-amber-100' : 'bg-white/25 hover:bg-white/50'}`}
              aria-label={`View discovery ${index + 1}`}
              aria-current={index + 1 === discoveryNumber ? 'step' : undefined}
            />
          ))}
        </div>
        {canGoDeeper ? (
          <button
            type="button"
            onClick={onGoDeeper}
            disabled={isDeepening}
            className="inline-flex items-center gap-2 rounded-full border border-amber-100/40 bg-amber-100/10 px-4 py-2 text-sm font-bold text-amber-50 transition hover:bg-amber-100/20 disabled:cursor-wait disabled:opacity-75 focus:outline-none focus:ring-4 focus:ring-amber-100/20"
          >
            {isDeepening ? 'Following the glimmer…' : 'Go deeper'}
            {isDeepening ? <Sparkles className="size-4 animate-pulse" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenStory}
            className="inline-flex items-center gap-2 rounded-full border border-amber-100/40 bg-amber-100 px-4 py-2 text-sm font-bold text-purple-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/30"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Create my Joy Story
          </button>
        )}
      </div>
      {discoveryCount > 1 && (
        <div className="mt-4 flex justify-center gap-3 text-xs font-semibold text-white/60">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Tap a glowing dot to revisit a discovery.
          <ChevronRight className="size-4" aria-hidden="true" />
        </div>
      )}
      {deepeningError && (
        <p className="mt-4 rounded-xl bg-rose-100/10 px-3 py-2 text-center text-xs leading-relaxed text-rose-50/85">
          {deepeningError}
        </p>
      )}
    </motion.article>
  )
}

function SmileStory({
  signature,
  capsules,
  onClose,
}: {
  signature: JoySignature
  capsules: JoyCapsule[]
  onClose: () => void
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

  const shareStory = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My JOY:D Journey', text: storyText })
        setShareMessage('Your Joy Story is ready to travel.')
        return
      }

      await navigator.clipboard.writeText(storyText)
      setShareMessage('Joy Story copied — paste it wherever you share joy.')
    } catch {
      setShareMessage('Sharing paused. You can still save this card with a screenshot.')
    }
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
        className="relative w-full max-w-md overflow-y-auto rounded-[2rem] border border-amber-100/30 bg-[linear-gradient(145deg,#572a7d,#251244_58%,#182a52)] p-6 text-left shadow-2xl shadow-black/40"
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
              <HeartHandshake className="mx-auto size-7 text-amber-100" aria-hidden="true" />
              <p className="mt-2 font-serif text-2xl font-black text-white">Your smile found another smile.</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-50/85">Two strangers. One {match.sharedShape.toLowerCase()} frequency.</p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-amber-100">{match.similarity}% JOY:D resonance</p>
              <p className="mt-3 text-xs leading-relaxed text-white/50">
                {match.matchSource === 'live'
                  ? 'A live anonymous JOY:D traveler is nearby. No profiles or identities are revealed.'
                  : 'A waiting demo traveler helped awaken this local JOY:D universe.'}
              </p>
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
