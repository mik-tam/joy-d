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
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(30,16,58,0.92)_0%,rgba(38,20,64,0.68)_43%,rgba(26,13,49,0.12)_100%)]" />
      <div className="joy-paper-grain absolute inset-0 -z-10" aria-hidden="true" />

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
      <motion.img
        src="/art/lantern-sea-hero.png"
        alt=""
        initial={reduceMotion ? false : { opacity: 0, scale: 1.07 }}
        animate={reduceMotion ? { opacity: 0.43 } : { opacity: [0, 0.48, 0.43], scale: [1.07, 1.02, 1.05], x: [0, -8, 0] }}
        transition={{ duration: 18, ease: 'easeInOut' }}
        className="absolute inset-0 h-full w-full object-cover object-center mix-blend-screen"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,13,50,0.34),transparent_58%,rgba(20,10,42,0.12))]" />
      <motion.img
        src="/art/dusk-cloud-bank.png"
        alt=""
        initial={reduceMotion ? false : { opacity: 0, x: '52vw' }}
        animate={reduceMotion ? { opacity: 0.68, x: '19vw' } : { opacity: [0, 0.7, 0.6], x: ['52vw', '19vw', '23vw'], y: ['-8vh', '1vh', '-1vh'] }}
        transition={{ duration: 26, ease: 'easeInOut', repeat: Infinity }}
        className="absolute -top-[9%] h-[54%] w-[96%] max-w-[90rem] object-contain object-top opacity-70"
      />
      <motion.img
        src="/art/dusk-cloud-bank.png"
        alt=""
        initial={reduceMotion ? false : { opacity: 0, x: '-70vw' }}
        animate={reduceMotion ? { opacity: 0.78, x: '-13vw' } : { opacity: [0, 0.8, 0.72], x: ['-70vw', '-13vw', '8vw'], y: [0, -10, 0] }}
        transition={{ duration: 34, ease: 'easeInOut', repeat: Infinity }}
        className="absolute top-[13%] h-[46%] w-[118%] max-w-none object-contain object-left"
      />
      <motion.img
        src="/art/dusk-cloud-bank.png"
        alt=""
        initial={reduceMotion ? false : { opacity: 0, x: '76vw' }}
        animate={reduceMotion ? { opacity: 0.42, x: '14vw' } : { opacity: [0, 0.42, 0.34], x: ['76vw', '14vw', '-8vw'], y: [8, 0, 10] }}
        transition={{ duration: 42, ease: 'easeInOut', repeat: Infinity, delay: -12 }}
        className="absolute top-[30%] h-[34%] w-[104%] max-w-none scale-x-[-1] object-contain object-right"
      />
      {[{ bottom: '-4%', opacity: 0.64, duration: 24, delay: -3, scale: 1.15 }, { bottom: '-13%', opacity: 0.84, duration: 30, delay: -13, scale: 1.34 }, { bottom: '-22%', opacity: 1, duration: 36, delay: -21, scale: 1.58 }].map((wave, index) => (
        <motion.img
          key={wave.bottom}
          src="/art/moonlit-wave-band.png"
          alt=""
          initial={reduceMotion ? false : { opacity: 0, x: index % 2 ? '80vw' : '-80vw' }}
          animate={reduceMotion ? { opacity: wave.opacity, x: '-10vw' } : { opacity: [0, wave.opacity, wave.opacity], x: [index % 2 ? '80vw' : '-80vw', '-10vw', index % 2 ? '-24vw' : '4vw'], y: [0, -8, 0] }}
          transition={{ duration: wave.duration, ease: 'easeInOut', repeat: Infinity, delay: wave.delay }}
          className="absolute h-[46%] w-[138%] max-w-none object-contain object-bottom"
          style={{ bottom: wave.bottom, scale: wave.scale }}
        />
      ))}
      <motion.img
        src="/art/lantern-boat.png"
        alt=""
        initial={reduceMotion ? false : { opacity: 0, x: '120vw', y: 25, rotate: 8 }}
        animate={reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 1, x: ['120vw', '7vw', '11vw', '7vw'], y: [25, 0, -14, 0], rotate: [8, -3, 2, -3] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[8%] right-[10%] w-[min(36vw,29rem)] drop-shadow-[0_22px_25px_rgba(12,4,38,0.46)]"
      />
      <motion.img
        src="/art/portal-garden.png"
        alt=""
        initial={reduceMotion ? false : { opacity: 0, x: '36vw', y: 30 }}
        animate={reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: [0, 1, 1], x: ['36vw', '0vw', '1vw'], y: [30, 0, -8] }}
        transition={{ duration: 16, ease: 'easeInOut', repeat: Infinity }}
        className="absolute -bottom-[3%] -right-[5%] w-[min(48vw,43rem)] drop-shadow-[0_28px_35px_rgba(12,4,38,0.5)]"
      />
    </div>
  )
}
