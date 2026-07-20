import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Sparkles, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { SmileCamera } from '../components/SmileCamera/SmileCamera'

export function Home() {
  const [screen, setScreen] = useState<'welcome' | 'camera'>('welcome')
  const reduceMotion = useReducedMotion()

  if (screen === 'camera') {
    return <SmileCamera onBack={() => setScreen('welcome')} />
  }

  return (
    <main className="joy-landing relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#281941] px-6 py-12">
      <LayeredLanding />

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
          <div className="mx-auto mb-8 flex size-24 items-center justify-center rounded-[2rem] border-2 border-[#3b225b]/30 bg-gradient-to-br from-amber-100 via-rose-300 to-fuchsia-400 text-5xl shadow-[inset_0_2px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(22,8,42,0.36)] sm:mx-0">
            :D
          </div>
          <p className="mb-3 font-serif text-lg italic tracking-wide text-amber-100/90">A small voyage for the feeling that just arrived.</p>
          <h1 className="font-serif text-6xl font-black tracking-[-0.08em] text-white sm:text-8xl">
            JOY<span className="text-amber-200">:</span>D
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
      <motion.img
        src="/art/painted-stars.png"
        alt=""
        initial={reduceMotion ? false : { y: '-10vh', scale: 0.9 }}
        animate={reduceMotion ? { y: 0, scale: 1 } : { y: ['-10vh', '0vh', '-1vh'], scale: [0.9, 1, 1] }}
        transition={{ duration: 2.4, ease: 'easeOut' }}
        className="absolute top-[2%] left-[28%] h-[42%] w-[66%] max-w-none object-contain object-top"
      />
      <motion.img
        src="/art/crescent-moon.png"
        alt=""
        initial={reduceMotion ? false : { y: '-14vh', rotate: -7 }}
        animate={reduceMotion ? { y: 0, rotate: 0 } : { y: ['-14vh', '0vh', '-1vh'], rotate: [-7, 0, 1] }}
        transition={{ duration: 2.6, ease: 'easeOut', delay: 0.1 }}
        className="absolute top-[4%] right-[9%] z-10 h-[30%] w-[30%] max-w-[25rem] object-contain object-top drop-shadow-[0_0_38px_rgba(255,225,148,0.38)]"
      />
      <motion.img
        src="/art/dusk-cloud-bank.png"
        alt=""
        initial={reduceMotion ? false : { x: '100vw' }}
        animate={reduceMotion ? { x: 0 } : { x: ['100vw', '0vw'], y: ['-5vh', '0vh'] }}
        transition={{ duration: 5, ease: 'easeOut' }}
        className="absolute top-[17%] right-0 z-10 h-auto w-full object-contain"
      />
      <motion.img
        src="/art/portal-garden.png"
        alt=""
        initial={reduceMotion ? false : { y: '105vh', rotate: -2 }}
        animate={reduceMotion ? { y: 0, rotate: 0 } : { y: ['105vh', '0vh', '-1vh'], rotate: [-2, 0, 1] }}
        transition={{ duration: 10, ease: 'easeOut', delay: 1 }}
        className="absolute bottom-[7%] right-[-6%] z-10 w-[min(74vw,52rem)] drop-shadow-[0_28px_35px_rgba(12,4,38,0.5)]"
      />
      <motion.img
        src="/art/moonlit-wave-band.png"
        alt=""
        initial={reduceMotion ? false : { x: '-100vw' }}
        animate={reduceMotion ? { x: 0 } : { x: ['-100vw', '0vw', '-1vw'], y: [0, -5, 0] }}
        transition={{ duration: 7, ease: 'easeOut', delay: 0.5 }}
        className="absolute bottom-0 z-20 h-auto w-full object-contain"
      />
      <motion.img
        src="/art/lantern-boat.png"
        alt=""
        initial={reduceMotion ? false : { x: '120vw', y: 25, rotate: 8 }}
        animate={reduceMotion ? { x: 0, y: 0 } : { x: ['120vw', '7vw', '11vw', '7vw'], y: [25, 0, -14, 0], rotate: [8, -3, 2, -3] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[8%] right-[10%] z-30 w-[min(36vw,29rem)] drop-shadow-[0_22px_25px_rgba(12,4,38,0.46)]"
      />
    </div>
  )
}
