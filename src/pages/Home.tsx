import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Sparkles, WandSparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SmileCamera } from '../components/SmileCamera/SmileCamera'
import { DoorMark } from '../components/DoorMark'
import { readVoyages } from '../data/joyJournal'

export function Home() {
  const [screen, setScreen] = useState<'welcome' | 'camera'>('welcome')
  const [voyageCount, setVoyageCount] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (screen === 'welcome') setVoyageCount(readVoyages().length)
  }, [screen])

  if (screen === 'camera') {
    return <SmileCamera onBack={() => setScreen('welcome')} />
  }

  return (
    <main className="joy-landing relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#281941] px-6 py-12">
      <LayeredLanding />
      <VoyagingBoat />

      <section className="w-full max-w-5xl text-center sm:text-left">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-7 flex items-center justify-center gap-2 text-xs font-bold tracking-[0.32em] text-amber-100/90 sm:justify-start"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          A TINY PORTAL TO DELIGHT
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="joy-paper-card max-w-2xl rounded-[2.5rem] border border-[#ffe7a3]/40 bg-[#2c1b50]/68 p-8 shadow-[0_24px_80px_rgba(20,8,42,0.38)] backdrop-blur-xl sm:p-14"
        >
          <DoorMark className="mx-auto mb-8 size-24 drop-shadow-[0_12px_28px_rgba(22,8,42,0.36)] sm:mx-0" />
          <p className="mb-3 font-serif text-lg italic tracking-wide text-amber-100/90">A small voyage for the feeling that just arrived.</p>
          <h1 className="font-serif text-6xl font-black tracking-[-0.06em] text-white sm:text-8xl">
            JOY
            <motion.span
              animate={reduceMotion ? undefined : { scaleY: [1, 1, 0.12, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5.5, times: [0, 0.3, 0.6, 1] }}
              className="inline-block text-amber-200"
            >
              :
            </motion.span>
            D
          </h1>
          <p className="mx-auto mt-7 max-w-md text-2xl font-medium leading-snug text-white/95 sm:mx-0 sm:text-3xl">
            Every smile opens a new world.
          </p>
          <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-white/80 sm:mx-0">
            Somewhere beyond the tide, a lantern boat is waiting to carry one bright little moment into an impossible place.
          </p>

          <button
            type="button"
            onClick={() => setScreen('camera')}
            className="group mt-10 inline-flex items-center gap-3 rounded-full border border-white/50 bg-[#ffe8a8] px-6 py-3.5 font-bold text-purple-950 shadow-[0_10px_0_#b56a7a,0_17px_30px_rgba(20,8,42,0.38)] transition hover:-translate-y-1 hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/40"
          >
            <WandSparkles className="size-5" aria-hidden="true" />
            Open the little door
            <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </button>
        </motion.div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-7 max-w-md text-sm leading-relaxed text-white/70 sm:mx-0"
        >
          Your smile is the key. Camera and face signals stay in your browser; only a playful, non-scientific creative signature begins the story.
          {voyageCount > 0 && (
            <span className="mt-2 block text-amber-100/70">
              ✦ This device remembers {voyageCount === 1 ? 'one voyage' : `${voyageCount} voyages`} — each began with a smile.
            </span>
          )}
        </motion.p>
      </section>
    </main>
  )
}

function LayeredLanding() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#211638]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_88%,#cf7287_0%,#705272_31%,#2a214d_68%,#17102f_100%)]" />
      <StarField />
      <motion.img
        src="/art/crescent-moon.png"
        alt=""
        initial={reduceMotion ? false : { y: '-14vh', rotate: -7 }}
        animate={reduceMotion ? { y: 0, rotate: 0 } : { y: ['-14vh', '0vh', '-1vh'], rotate: [-7, 0, 1] }}
        transition={{ duration: 2.6, ease: 'easeOut', delay: 0.1 }}
        className="absolute top-[4%] right-[9%] z-10 h-[30%] w-[30%] max-w-[25rem] object-contain object-top drop-shadow-[0_0_38px_rgba(255,225,148,0.38)]"
      />
      <DriftingClouds />
      <motion.img
        src="/art/portal-garden.png"
        alt=""
        initial={reduceMotion ? false : { y: '105vh', rotate: -2 }}
        animate={reduceMotion ? { y: 0, rotate: 0 } : { y: ['105vh', '0vh', '-1vh'], rotate: [-2, 0, 1] }}
        transition={{ duration: 10, ease: 'easeOut', delay: 1 }}
        className="absolute bottom-[17%] right-[-6%] z-10 w-[min(74vw,52rem)] drop-shadow-[0_28px_35px_rgba(12,4,38,0.5)]"
      />
      <motion.img
        src="/art/moonlit-wave-band.png"
        alt=""
        initial={reduceMotion ? false : { x: '100vw' }}
        animate={reduceMotion ? { x: '-9vw' } : { x: ['100vw', '-9vw', '-8vw'], y: [0, -4, 0] }}
        transition={{ duration: 9, ease: 'easeOut', delay: 0.9 }}
        className="absolute -bottom-[19%] z-[15] h-auto w-full scale-125 object-contain opacity-55"
      />
      <motion.img
        src="/art/moonlit-wave-band.png"
        alt=""
        initial={reduceMotion ? false : { x: '-100vw' }}
        animate={reduceMotion ? { x: '6vw' } : { x: ['-100vw', '6vw', '5vw'], y: [0, -5, 0] }}
        transition={{ duration: 6.5, ease: 'easeOut', delay: 0.3 }}
        className="absolute -bottom-[11%] z-20 h-auto w-full scale-125 object-contain"
      />
    </div>
  )
}

function VoyagingBoat() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      <motion.img
        src="/art/lantern-boat.png"
        alt=""
        initial={reduceMotion ? false : { x: '120vw', y: 25, rotate: 8 }}
        animate={
          reduceMotion
            ? { x: 0, y: 0 }
            : {
                x: ['120vw', '6vw', '-26vw', '-12vw', '-115vw'],
                y: [25, 0, -6, 4, 26],
                rotate: [8, -3, 4, -5, -12],
              }
        }
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.22, 0.5, 0.66, 1],
        }}
        className="absolute bottom-[8%] right-[10%] z-30 w-[min(36vw,29rem)] drop-shadow-[0_22px_25px_rgba(12,4,38,0.46)]"
      />
      <motion.div
        initial={reduceMotion ? false : { x: '-100vw' }}
        animate={reduceMotion ? { x: '-15vw' } : { x: ['-100vw', '-15vw', '-14vw'], y: [0, -3, 0] }}
        transition={{ duration: 7.5, ease: 'easeOut', delay: 0.7 }}
        className="absolute inset-x-0 -bottom-[32%] z-[35] opacity-95"
      >
        <img
          src="/art/moonlit-wave-band.png"
          alt=""
          className="h-auto w-full -scale-x-105 scale-y-105 object-contain"
        />
      </motion.div>
    </div>
  )
}

function DriftingClouds() {
  const reduceMotion = useReducedMotion()

  return (
    <>
      <motion.div
        initial={reduceMotion ? false : { x: '60vw', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 6, ease: 'easeOut', delay: 0.4 }}
        className="absolute top-[11%] right-[-8%] z-10 w-[68%]"
      >
        <motion.img
          src="/art/dusk-cloud-bank.png"
          alt=""
          animate={reduceMotion ? undefined : { x: [0, 30, 0] }}
          transition={{ duration: 46, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full -scale-x-100 opacity-60"
        />
      </motion.div>
      <motion.div
        initial={reduceMotion ? false : { x: '100vw', y: '-5vh' }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 5, ease: 'easeOut' }}
        className="absolute top-[17%] right-0 z-10 w-full"
      >
        <motion.img
          src="/art/dusk-cloud-bank.png"
          alt=""
          animate={reduceMotion ? undefined : { x: [0, -34, 0] }}
          transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full"
        />
      </motion.div>
      <motion.div
        initial={reduceMotion ? false : { x: '-70vw', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 6.5, ease: 'easeOut', delay: 0.8 }}
        className="absolute top-[30%] left-[-10%] z-10 w-[52%]"
      >
        <motion.img
          src="/art/dusk-cloud-bank.png"
          alt=""
          animate={reduceMotion ? undefined : { x: [0, 24, 0] }}
          transition={{ duration: 52, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full opacity-80"
        />
      </motion.div>
    </>
  )
}

const starSheet = { url: '/art/painted-stars.png', width: 1405, height: 1120, crop: 130 }

const starSprites = [
  { cx: 128, cy: 99, left: '31%', top: '5%', size: 30, delay: 0.2, duration: 4.2 },
  { cx: 492, cy: 156, left: '43%', top: '15%', size: 24, delay: 1.4, duration: 3.4 },
  { cx: 990, cy: 186, left: '55%', top: '3%', size: 40, delay: 0.8, duration: 5 },
  { cx: 1207, cy: 229, left: '88%', top: '27%', size: 32, delay: 2.1, duration: 4.6 },
  { cx: 712, cy: 284, left: '48%', top: '9%', size: 34, delay: 3, duration: 3.8 },
  { cx: 163, cy: 393, left: '35%', top: '23%', size: 36, delay: 1, duration: 4.4 },
  { cx: 573, cy: 469, left: '62%', top: '19%', size: 38, delay: 2.6, duration: 5.2 },
  { cx: 1183, cy: 516, left: '92%', top: '9%', size: 28, delay: 0.5, duration: 3.6 },
  { cx: 318, cy: 637, left: '40%', top: '31%', size: 26, delay: 1.8, duration: 4 },
  { cx: 920, cy: 635, left: '70%', top: '6%', size: 32, delay: 3.4, duration: 4.8 },
  { cx: 655, cy: 700, left: '54%', top: '27%', size: 24, delay: 0.7, duration: 3.2 },
  { cx: 155, cy: 871, left: '78%', top: '17%', size: 30, delay: 2.3, duration: 4.1 },
]

function StarField() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="absolute inset-0">
      {starSprites.map((star) => {
        const scale = star.size / starSheet.crop
        return (
          <motion.span
            key={`${star.cx}-${star.cy}`}
            animate={
              reduceMotion
                ? { opacity: 0.9 }
                : { opacity: [0.45, 1, 0.45], scale: [1, 1.14, 1] }
            }
            transition={
              reduceMotion
                ? { duration: 1 }
                : { duration: star.duration, repeat: Infinity, ease: 'easeInOut', delay: star.delay }
            }
            className="absolute"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              backgroundImage: `url(${starSheet.url})`,
              backgroundSize: `${starSheet.width * scale}px ${starSheet.height * scale}px`,
              backgroundPosition: `${-(star.cx - starSheet.crop / 2) * scale}px ${-(star.cy - starSheet.crop / 2) * scale}px`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )
      })}
    </div>
  )
}
