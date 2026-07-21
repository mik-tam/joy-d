import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { SmileCamera } from '../components/SmileCamera/SmileCamera'

export function Home() {
  const [screen, setScreen] = useState<'welcome' | 'camera'>('welcome')
  const reduceMotion = useReducedMotion()

  if (screen === 'camera') {
    return <SmileCamera onBack={() => setScreen('welcome')} />
  }

  return (
    <main className="joy-landing relative isolate flex h-dvh max-h-dvh items-center justify-center overflow-hidden overscroll-none bg-[#281941] px-6 py-12">
      <LayeredLanding />
      <VoyagingBoat />

      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap text-center text-[0.68rem] font-bold tracking-[0.25em] text-amber-100/90 drop-shadow-[0_1px_2px_rgba(20,8,42,0.95),0_2px_10px_rgba(20,8,42,0.75)] sm:top-11 sm:text-xs sm:tracking-[0.32em] [@media(max-height:560px)]:hidden"
      >
        JOY:D — A TINY PORTAL TO DELIGHT
      </motion.p>

      <section className="relative z-10 flex w-full flex-col items-center text-center">
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.6, ease: 'easeOut' }}
          className="relative z-10 font-serif text-[clamp(1.4rem,min(6vw,8vh),4rem)] font-black leading-[1.08] tracking-[0.02em] text-[#fff3cf] drop-shadow-[0_4px_18px_rgba(22,8,42,0.85)]"
        >
          <span className="block">EVERY SMILE</span>
          <span className="block">OPENS A NEW WORLD</span>
        </motion.h1>

        <motion.div
          initial={reduceMotion ? false : { y: '105vh', rotate: -2 }}
          animate={reduceMotion ? { y: 0, rotate: 0 } : { y: ['105vh', '0vh', '-1vh'], rotate: [-2, 0, 1] }}
          transition={{ duration: 10, ease: 'easeOut', delay: 1 }}
          className="relative mt-2 w-[clamp(min(34rem,105vh),min(96vw,98vh),60rem)] max-w-none -translate-x-[16.7%] translate-y-[clamp(0px,calc((640px_-_100vw)*0.2),6vh)] sm:mt-4"
        >
          <img
            src="/art/portal-garden.png"
            alt=""
            className="w-full drop-shadow-[0_28px_35px_rgba(12,4,38,0.5)]"
          />
          {/* Clickable entry: the glowing space inside the open doorway. */}
          <button
            type="button"
            onClick={() => setScreen('camera')}
            className="group absolute left-[60%] top-[25.5%] flex h-[50%] w-[13.5%] items-center justify-center rounded-t-full px-[1%] transition duration-300 hover:bg-amber-100/25 hover:shadow-[0_0_60px_rgba(255,222,140,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-100/80"
          >
            <span className="font-serif text-[clamp(1.1rem,3vw,1.8rem)] font-black leading-tight text-[#6b3a10] drop-shadow-[0_1px_0_rgba(255,247,214,0.8)] transition group-hover:scale-110">
              Enter
            </span>
          </button>
        </motion.div>
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
    </div>
  )
}

function VoyagingBoat() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {/* Sea fill under the wave art so rubber-band / tall phones never flash
          an empty purple strip at the bottom edge. */}
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#1a2848] via-[#2a5f6e] to-transparent" />
      {/* Wave placement is self-relative: each band is anchored to the screen
          bottom and pushed down by a percentage of its own artwork height, so
          the composition scales continuously across every window size. */}
      <motion.div
        initial={reduceMotion ? false : { x: '100vw' }}
        animate={{ x: '-9vw' }}
        transition={{ duration: 9, ease: 'easeOut', delay: 0.9 }}
        className="absolute inset-x-0 bottom-0 z-10 opacity-55"
      >
        <motion.img
          src="/art/moonlit-wave-band.png"
          alt=""
          animate={reduceMotion ? undefined : { x: [0, '2.5vw', '-2vw', 0], y: [0, -4, -1, 0] }}
          transition={{ duration: 138, repeat: Infinity, ease: 'easeInOut', delay: 9.9 }}
          className="relative left-1/2 h-auto w-[max(115vw,95vh)] max-w-none -translate-x-1/2 translate-y-[8%] sm:translate-y-[14%] landscape:translate-y-[calc(70%-32vh)]"
        />
      </motion.div>
      <motion.div
        initial={reduceMotion ? false : { x: '-100vw' }}
        animate={{ x: '6vw' }}
        transition={{ duration: 6.5, ease: 'easeOut', delay: 0.3 }}
        className="absolute inset-x-0 bottom-0 z-20"
      >
        <motion.img
          src="/art/moonlit-wave-band.png"
          alt=""
          animate={reduceMotion ? undefined : { x: [0, '-3vw', '2vw', 0], y: [0, -5, -2, 0] }}
          transition={{ duration: 116, repeat: Infinity, ease: 'easeInOut', delay: 6.8 }}
          className="relative left-1/2 h-auto w-[max(115vw,95vh)] max-w-none -translate-x-1/2 translate-y-[24%] sm:translate-y-[33%] landscape:translate-y-[calc(70%-22vh)]"
        />
      </motion.div>
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
        className="absolute bottom-[10%] right-[8%] z-40 w-[min(48vw,29rem)] opacity-100 drop-shadow-[0_22px_25px_rgba(12,4,38,0.46)] landscape:bottom-[4%] landscape:right-[10%] landscape:w-[min(36vw,29rem,55vh)]"
      />
      {/* Front tide rides above the boat so the hull sails in the sea. */}
      <motion.div
        initial={reduceMotion ? false : { x: '-100vw' }}
        animate={{ x: '-15vw' }}
        transition={{ duration: 7.5, ease: 'easeOut', delay: 0.7 }}
        className="absolute inset-x-0 bottom-0 z-[45] opacity-95"
      >
        <motion.img
          src="/art/moonlit-wave-band.png"
          alt=""
          animate={reduceMotion ? undefined : { x: [0, '2vw', '-2.5vw', 0], y: [0, -3, -1, 0] }}
          transition={{ duration: 154, repeat: Infinity, ease: 'easeInOut', delay: 8.2 }}
          className="relative left-1/2 h-auto w-[max(115vw,95vh)] max-w-none -scale-x-100 -translate-x-1/2 translate-y-[42%] sm:translate-y-[54%] landscape:translate-y-[calc(70%-12vh)]"
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
