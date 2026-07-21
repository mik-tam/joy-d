import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { JoyCapsule, WorldSceneBiome, WorldSceneElement } from '../../data/joyCapsule'
import { hashWorld, resolveScene } from '../../data/joyScene'
import type { WorldSceneImages } from '../../data/joySceneImages'

type WorldStageProps = {
  capsule: JoyCapsule
  images?: WorldSceneImages
  smileScore?: number
  colorTrail?: string[]
}

type WorldSecretProps = {
  capsule: JoyCapsule
  hiddenRevealed: boolean
  onRevealHidden: () => void
  wowCharge?: number
  revealedImage?: string | null
}

type BiomeStyle = {
  backdrop: string
  glow: string
  petals: string[]
  symbols: string[]
}

const biomeStyles: Record<WorldSceneBiome, BiomeStyle> = {
  'moonlit-sea': {
    backdrop: 'from-[#062a51] via-[#0e5f77] to-[#53b9b7]',
    glow: '#ffcf80',
    petals: ['#9ee8df', '#f7c7a3', '#f9efb1'],
    symbols: ['◒', '◌', '〰', '✦'],
  },
  'cloud-garden': {
    backdrop: 'from-[#173d3c] via-[#4a7960] to-[#b4c96a]',
    glow: '#ffe59a',
    petals: ['#f4b8d7', '#f9d982', '#9ee4bf'],
    symbols: ['❋', '✿', '⌇', '✦'],
  },
  'star-harbor': {
    backdrop: 'from-[#120c3b] via-[#392965] to-[#8b5fa7]',
    glow: '#fff1b1',
    petals: ['#e6b8ff', '#a5d8ff', '#fff0a6'],
    symbols: ['✦', '✧', '☾', '⋆'],
  },
  'sunrise-meadow': {
    backdrop: 'from-[#8a2f68] via-[#e26774] to-[#f5b55a]',
    glow: '#fff2ad',
    petals: ['#ff9cb4', '#ffd575', '#b9ebd8'],
    symbols: ['✦', '◈', '❈', '☀'],
  },
  'night-interior': {
    backdrop: 'from-[#302061] via-[#805591] to-[#d6929d]',
    glow: '#ffe7a3',
    petals: ['#f2afc5', '#aacff4', '#f8df93'],
    symbols: ['✦', '✧', '◉', '❋'],
  },
}

const spriteWidths: Record<WorldSceneElement['size'], string> = {
  tiny: 'min(10vw, 7rem)',
  small: 'min(17vw, 13rem)',
  grand: 'min(34vw, 26rem)',
  colossal: 'min(58vw, 44rem)',
}

const spriteHalf: Record<WorldSceneElement['size'], number> = {
  tiny: 5,
  small: 9,
  grand: 17,
  colossal: 26,
}

// Keep floating subjects out of portal chrome: story panel (center-top),
// bottom controls, smile meter, and corner buttons.
function placeAwayFromUi(x: number, y: number, size: WorldSceneElement['size'] = 'small') {
  const half = spriteHalf[size]
  const floorY = size === 'colossal' || size === 'grand' ? 56 : 48
  let nextX = Math.min(96 - half, Math.max(half + 2, x))
  let nextY = Math.min(68 - half * 0.2, Math.max(22, y))

  // Story panel sits in the upper center — clear that whole band.
  if (nextY < floorY) {
    nextY = floorY
    if (nextX > 24 && nextX < 76) {
      nextX = nextX < 50 ? Math.min(nextX, 18) : Math.max(nextX, 82)
    }
  }
  // Bottom CTA band.
  if (nextY > 70) nextY = 62
  // Smile meter pocket (bottom-left).
  if (nextX < 28 && nextY > 58) {
    nextX = Math.max(nextX, 34)
    nextY = Math.min(nextY, 56)
  }
  // Sound controls (top-right).
  if (nextX > 78 && nextY < 30) {
    nextX = 72
    nextY = Math.max(nextY, floorY)
  }

  return { x: nextX, y: nextY }
}

function wonderPocket(seed: number) {
  const pockets = [
    { left: 16, top: 56 },
    { left: 84, top: 54 },
    { left: 20, top: 62 },
    { left: 80, top: 60 },
    { left: 14, top: 50 },
    { left: 86, top: 48 },
  ]
  return pockets[seed % pockets.length]
}

function motionProps(element: WorldSceneElement, index: number, reduceMotion: boolean) {
  if (reduceMotion || element.motion === 'still') return {}
  const drift = 18 + (index % 3) * 9
  switch (element.motion) {
    case 'drift':
      return {
        animate: { x: [0, drift, 0, -drift * 0.6, 0] },
        transition: { duration: 16 + index * 2.4, repeat: Infinity, ease: 'easeInOut' as const },
      }
    case 'bob':
      return {
        animate: { y: [0, -12, 0], rotate: [-2.5, 2.5, -2.5] },
        transition: { duration: 7 + index * 1.3, repeat: Infinity, ease: 'easeInOut' as const },
      }
    case 'spin-slow':
      return {
        animate: { rotate: 360 },
        transition: { duration: 46 + index * 6, repeat: Infinity, ease: 'linear' as const },
      }
    case 'float':
      return {
        animate: { y: [0, -20, 0] },
        transition: { duration: 12 + index * 1.8, repeat: Infinity, ease: 'easeInOut' as const },
      }
  }
}

function SceneSprite({
  element,
  index,
  reduceMotion,
  imageUrl,
  smileScore,
}: {
  element: WorldSceneElement
  index: number
  reduceMotion: boolean
  imageUrl: string
  smileScore: number
}) {
  const width = spriteWidths[element.size]
  // A live smile makes the whole scene flow: each element drifts along its
  // own direction and grows slightly, settling back when the smile rests.
  const sway = reduceMotion ? 0 : smileScore
  const driftX = Math.sin(index * 2.1 + 0.8) * 28 * sway
  const driftY = -Math.cos(index * 1.7 + 0.4) * 32 * sway

  const placed = placeAwayFromUi(element.x, element.y, element.size)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: reduceMotion ? 0 : 0.6 + index * 0.25, duration: reduceMotion ? 0.2 : 1.1, ease: 'easeOut' }}
      className="absolute"
      style={{ left: `${placed.x}%`, top: `${placed.y}%`, width, translate: '-50% -50%' }}
    >
      <div
        style={{
          transform: `translate(${driftX}px, ${driftY}px) scale(${1 + sway * 0.06})`,
          transition: 'transform 0.6s ease-out',
        }}
      >
        <motion.div {...motionProps(element, index, reduceMotion)}>
          <img
            src={imageUrl}
            alt=""
            className="h-auto w-full object-contain drop-shadow-[0_10px_24px_rgba(9,4,25,0.55)] [filter:drop-shadow(0_0_10px_rgba(255,244,214,0.28))]"
            style={{ transform: element.flip ? 'scaleX(-1)' : undefined }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}

export function WorldStage({ capsule, images, smileScore = 0, colorTrail }: WorldStageProps) {
  const reduceMotion = useReducedMotion()
  const scene = resolveScene(capsule)
  const style = biomeStyles[scene.biome]
  const seed = hashWorld(`${capsule.worldName}:${capsule.visualDirection}`)
  const glow = Math.min(Math.max(smileScore, 0), 1)

  return (
    <motion.div
      key={capsule.worldName}
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.9 }}
      style={{ filter: `saturate(${0.82 + glow * 0.45}) brightness(${0.9 + glow * 0.22})` }}
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br ${style.backdrop}`}
      aria-hidden="true"
    >
      {images?.backdrop && (
        <motion.img
          src={images.backdrop}
          alt=""
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ duration: reduceMotion ? 0.2 : 2.2, ease: 'easeOut' }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {images?.backdrop && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#10051f]/40" />
      )}
      <div className="absolute inset-0 opacity-65 [background-image:radial-gradient(circle_at_18%_18%,rgba(255,255,255,.22)_0_1px,transparent_1.5px),radial-gradient(circle_at_75%_64%,rgba(255,255,255,.18)_0_1px,transparent_1.5px)] [background-size:29px_31px,43px_47px]" />
      {scene.elements.map((element, index) => {
        const imageUrl = images?.elements[index]
        if (!imageUrl) return null
        // Never paint more than one doorway sprite, even from older capsules.
        if (
          element.sprite === 'garden-door'
          && scene.elements.findIndex((candidate) => candidate.sprite === 'garden-door') !== index
        ) {
          return null
        }
        return (
          <SceneSprite
            key={`${element.sprite}-${index}`}
            element={element}
            index={index}
            reduceMotion={Boolean(reduceMotion)}
            imageUrl={imageUrl}
            smileScore={glow}
          />
        )
      })}
      {[...Array(12)].map((_, index) => (
        <motion.span
          key={`spark-${index}`}
          animate={reduceMotion ? undefined : { opacity: [0.15, 0.9, 0.15], scale: [0.65, 1.3, 0.65], y: [0, -34 - (index % 4) * 14, 0] }}
          transition={{ duration: 3.4 + (index % 5), repeat: Infinity, delay: -index * 0.41 }}
          className="absolute text-xl"
          style={{ color: style.petals[index % style.petals.length], left: `${(seed + index * 29) % 94}%`, top: `${(seed + index * 47) % 86}%` }}
        >
          {style.symbols[index % style.symbols.length]}
        </motion.span>
      ))}
      {colorTrail && colorTrail.length > 0 && (
        <motion.div
          animate={reduceMotion ? undefined : { x: [0, 70, -50, 0], y: [0, -36, 22, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[16%] top-[28%] flex items-center gap-1"
        >
          {colorTrail.map((color, index) => (
            <motion.span
              key={color}
              animate={reduceMotion ? undefined : { y: [0, -7, 0], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.35, ease: 'easeInOut' }}
              className="rounded-full"
              style={{
                width: 16 - index * 4,
                height: 16 - index * 4,
                backgroundColor: color,
                boxShadow: `0 0 ${14 - index * 3}px ${5 - index}px ${color}99`,
              }}
            />
          ))}
        </motion.div>
      )}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,240,190,0.5),transparent_58%)] transition-opacity duration-300"
        style={{ opacity: glow * 0.85 }}
      />
    </motion.div>
  )
}

export function WorldSecret({
  capsule,
  hiddenRevealed,
  onRevealHidden,
  wowCharge = 0,
  revealedImage,
}: WorldSecretProps) {
  const reduceMotion = useReducedMotion()
  const [toastVisible, setToastVisible] = useState(false)
  const scene = resolveScene(capsule)
  const style = biomeStyles[scene.biome]
  const seed = hashWorld(`${capsule.worldName}:${capsule.visualDirection}`)
  // Always park the wonder in a side pocket below the story panel so it never
  // covers the readable UI — even when the cast anchor sits in the center.
  const pocket = wonderPocket(seed)
  const left = pocket.left
  const top = pocket.top
  const hiddenLabel = capsule.surprise.length > 82 ? `${capsule.surprise.slice(0, 79)}…` : capsule.surprise
  const transformed = hiddenRevealed && Boolean(revealedImage)

  // The found-message drifts away on its own so it never blocks the journey.
  useEffect(() => {
    if (!hiddenRevealed) {
      setToastVisible(false)
      return
    }
    setToastVisible(true)
    const timer = setTimeout(() => setToastVisible(false), 7000)
    return () => clearTimeout(timer)
  }, [hiddenRevealed])

  return (
    <>
      <motion.button
        type="button"
        onClick={onRevealHidden}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={
          hiddenRevealed
            ? { opacity: transformed ? 0 : 0.4, scale: transformed ? 0.3 : 0.84 }
            : reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 1, scale: [0.8, 1.16, 0.8], rotate: [0, 8, -5, 0] }
        }
        transition={hiddenRevealed || reduceMotion ? { duration: 0.45 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute z-20 grid size-[4.5rem] place-items-center rounded-[42%] border-2 border-white/85 bg-white/15 text-3xl shadow-[0_0_0_6px_rgba(255,231,163,0.17),0_0_35px_12px_rgba(255,220,119,0.55)] backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-white/60"
        style={{
          color: style.glow,
          left: `${left}%`,
          top: `${top}%`,
          translate: '-50% -50%',
          filter: `brightness(${1 + wowCharge * 0.9}) saturate(${1 + wowCharge * 0.5})`,
        }}
        aria-label={hiddenRevealed ? 'Hidden wonder discovered' : `Reveal the hidden wonder with a WOW face — or tap: ${hiddenLabel}`}
        disabled={hiddenRevealed}
      >
        <motion.span
          animate={reduceMotion ? undefined : { rotate: [0, 12, -12, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative grid place-items-center"
          aria-hidden="true"
        >
          <Sparkles className="size-8" />
          <motion.span
            animate={reduceMotion ? undefined : { opacity: [0.65, 1, 0.65], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-4 rounded-full bg-[#2a164e]/75 px-1.5 py-0.5 text-[10px] font-black tracking-[0.18em] text-amber-100 shadow-[0_0_12px_rgba(255,221,122,0.8)]"
          >
            WOW
          </motion.span>
        </motion.span>
      </motion.button>
      {transformed && revealedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.25 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0.3 : 1.1, ease: 'easeOut' }}
          className="pointer-events-none absolute z-10 w-[min(26vw,13rem)] sm:w-[min(28vw,15rem)]"
          style={{ left: `${left}%`, top: `${top}%`, translate: '-50% -50%' }}
          aria-hidden="true"
        >
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -14, 0], rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src={revealedImage}
              alt=""
              className="h-auto w-full object-contain drop-shadow-[0_0_28px_rgba(255,231,163,0.45)]"
            />
          </motion.div>
        </motion.div>
      )}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute bottom-32 left-1/2 z-20 w-[min(24rem,calc(100%-3rem))] -translate-x-1/2 rounded-3xl border border-white/35 bg-[#1f123f]/72 p-4 text-center shadow-2xl backdrop-blur-md"
            role="status"
          >
            <p className="text-xs font-bold tracking-[0.2em] text-amber-100">YOU FOUND IT</p>
            <p className="mt-2 font-serif text-base italic text-white">{hiddenLabel}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
