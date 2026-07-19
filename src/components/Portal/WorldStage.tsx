import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { JoyCapsule } from '../../data/joyCapsule'

type WorldStageProps = {
  capsule: JoyCapsule
}

type WorldSecretProps = {
  capsule: JoyCapsule
  hiddenRevealed: boolean
  onRevealHidden: () => void
}

type WorldPalette = {
  backdrop: string
  glow: string
  ink: string
  petals: string[]
  symbols: string[]
}

function hash(value: string) {
  let result = 5381
  for (const character of value) result = (result * 33) ^ character.charCodeAt(0)
  return result >>> 0
}

function paletteFor(capsule: JoyCapsule): WorldPalette {
  const words = `${capsule.visualDirection} ${capsule.story} ${capsule.soundMood}`.toLowerCase()
  if (/sea|ocean|tide|wave|coral|harbour|boat/.test(words)) {
    return { backdrop: 'from-[#062a51] via-[#0e5f77] to-[#53b9b7]', glow: '#ffcf80', ink: '#e7fff5', petals: ['#9ee8df', '#f7c7a3', '#f9efb1'], symbols: ['◒', '◌', '〰', '✦'] }
  }
  if (/forest|garden|flower|moss|leaf|bloom|cloud/.test(words)) {
    return { backdrop: 'from-[#173d3c] via-[#4a7960] to-[#b4c96a]', glow: '#ffe59a', ink: '#f7f9db', petals: ['#f4b8d7', '#f9d982', '#9ee4bf'], symbols: ['❋', '✿', '⌇', '✦'] }
  }
  if (/star|moon|night|cosmic|planet|comet|space/.test(words)) {
    return { backdrop: 'from-[#120c3b] via-[#392965] to-[#8b5fa7]', glow: '#fff1b1', ink: '#f7edff', petals: ['#e6b8ff', '#a5d8ff', '#fff0a6'], symbols: ['✦', '✧', '☾', '⋆'] }
  }
  if (/rainbow|sun|gold|bright|citrus|warm/.test(words)) {
    return { backdrop: 'from-[#8a2f68] via-[#e26774] to-[#f5b55a]', glow: '#fff2ad', ink: '#fff8e3', petals: ['#ff9cb4', '#ffd575', '#b9ebd8'], symbols: ['✦', '◈', '❈', '☀'] }
  }
  return { backdrop: 'from-[#302061] via-[#805591] to-[#d6929d]', glow: '#ffe7a3', ink: '#fff6e7', petals: ['#f2afc5', '#aacff4', '#f8df93'], symbols: ['✦', '✧', '◉', '❋'] }
}

function tokenWords(text: string) {
  return text.split(/[^a-zA-Z]+/).filter((word) => word.length >= 4).slice(0, 6)
}

export function WorldStage({ capsule }: WorldStageProps) {
  const reduceMotion = useReducedMotion()
  const palette = paletteFor(capsule)
  const seed = hash(`${capsule.worldName}:${capsule.visualDirection}`)
  const words = tokenWords(capsule.visualDirection)

  return (
    <motion.div
      key={capsule.worldName}
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.9 }}
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br ${palette.backdrop}`}
    >
      <div className="absolute inset-0 opacity-65 [background-image:radial-gradient(circle_at_18%_18%,rgba(255,255,255,.22)_0_1px,transparent_1.5px),radial-gradient(circle_at_75%_64%,rgba(255,255,255,.18)_0_1px,transparent_1.5px)] [background-size:29px_31px,43px_47px]" />
      {[...Array(9)].map((_, index) => {
        const size = 100 + ((seed >> (index % 16)) % 170)
        return (
          <motion.span
            key={index}
            animate={reduceMotion ? undefined : { x: [0, (index % 2 ? -1 : 1) * (45 + index * 8), 0], y: [0, -25 - index * 5, 0], rotate: [0, index % 2 ? -8 : 8, 0] }}
            transition={{ duration: 10 + index * 1.7, repeat: Infinity, ease: 'easeInOut', delay: -index * 0.8 }}
            className="absolute rounded-[46%] border border-white/15 bg-white/10 blur-[0.2px]"
            style={{ width: size, height: size * 0.58, left: `${(index * 23 + 5) % 100}%`, top: `${(index * 17 + 8) % 92}%` }}
          />
        )
      })}
      {[...Array(18)].map((_, index) => (
        <motion.span
          key={`spark-${index}`}
          animate={reduceMotion ? undefined : { opacity: [0.15, 0.95, 0.15], scale: [0.65, 1.35, 0.65], y: [0, -36 - (index % 4) * 15, 0] }}
          transition={{ duration: 3.4 + (index % 5), repeat: Infinity, delay: -index * 0.41 }}
          className="absolute text-xl"
          style={{ color: palette.petals[index % palette.petals.length], left: `${(seed + index * 29) % 94}%`, top: `${(seed + index * 47) % 86}%` }}
        >
          {palette.symbols[index % palette.symbols.length]}
        </motion.span>
      ))}
      {words.map((word, index) => (
        <motion.span
          key={word}
          animate={reduceMotion ? undefined : { x: [0, 18, -9, 0], y: [0, -18, 7, 0], opacity: [0.16, 0.43, 0.16] }}
          transition={{ duration: 9 + index * 1.4, repeat: Infinity, delay: -index * 1.1 }}
          className="absolute max-w-32 font-serif text-sm italic tracking-wide"
          style={{ color: palette.ink, left: `${12 + index * 15}%`, top: `${16 + ((index * 23) % 58)}%` }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

export function WorldSecret({ capsule, hiddenRevealed, onRevealHidden }: WorldSecretProps) {
  const reduceMotion = useReducedMotion()
  const palette = paletteFor(capsule)
  const seed = hash(`${capsule.worldName}:${capsule.visualDirection}`)
  const hiddenLabel = capsule.surprise.length > 82 ? `${capsule.surprise.slice(0, 79)}…` : capsule.surprise

  return (
    <>
      <motion.button
        type="button"
        onClick={onRevealHidden}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={hiddenRevealed ? { opacity: 0.4, scale: 0.84 } : reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [0.8, 1.16, 0.8], rotate: [0, 8, -5, 0] }}
        transition={hiddenRevealed || reduceMotion ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute z-20 grid size-20 place-items-center rounded-[42%] border-2 border-white/85 bg-white/15 text-3xl shadow-[0_0_0_6px_rgba(255,231,163,0.17),0_0_35px_12px_rgba(255,220,119,0.55)] backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-white/60"
        style={{ color: palette.glow, left: `${62 + (seed % 20)}%`, top: `${54 + ((seed >> 4) % 23)}%` }}
        aria-label={hiddenRevealed ? 'Hidden wonder discovered' : `Reveal hidden wonder: ${hiddenLabel}`}
        disabled={hiddenRevealed}
      >
        <Sparkles className="size-8" aria-hidden="true" />
      </motion.button>
      {hiddenRevealed && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="pointer-events-none absolute bottom-7 left-1/2 z-20 w-[min(24rem,calc(100%-3rem))] -translate-x-1/2 rounded-3xl border border-white/35 bg-[#1f123f]/72 p-4 text-center shadow-2xl backdrop-blur-md"
          role="status"
        >
          <p className="text-xs font-bold tracking-[0.2em] text-amber-100">YOU FOUND IT</p>
          <p className="mt-2 font-serif text-base italic text-white">{hiddenLabel}</p>
        </motion.div>
      )}
    </>
  )
}
