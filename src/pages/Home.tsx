import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Sparkles, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { SmileCamera } from '../components/SmileCamera/SmileCamera'

export function Home() {
  const [screen, setScreen] = useState<'welcome' | 'camera'>('welcome')

  if (screen === 'camera') {
    return <SmileCamera onBack={() => setScreen('welcome')} />
  }

  return (
    <main className="joy-landing relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#281941] px-6 py-12">
      <div className="absolute inset-0 -z-30 bg-[url('/art/lantern-sea-hero.png')] bg-cover bg-center" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(30,16,58,0.9)_0%,rgba(38,20,64,0.62)_43%,rgba(26,13,49,0.12)_100%)]" />
      <div className="joy-paper-grain absolute inset-0 -z-10" aria-hidden="true" />
      <WanderingWorld />
      <div className="joy-spark joy-spark-one absolute left-[12%] top-[15%]" aria-hidden="true">✦</div>
      <div className="joy-spark joy-spark-two absolute left-[39%] top-[28%]" aria-hidden="true">✧</div>
      <div className="joy-spark joy-spark-three absolute bottom-[22%] left-[27%]" aria-hidden="true">✦</div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
        className="absolute -right-28 -top-24 -z-10 size-96 rounded-full border border-white/15"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
        className="absolute -bottom-32 -left-28 -z-10 size-[30rem] rounded-full border border-amber-100/20"
      />

      <section className="w-full max-w-5xl text-center sm:text-left">
        <motion.p
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-7 flex items-center justify-center gap-2 text-xs font-bold tracking-[0.32em] text-amber-100/90 sm:justify-start"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          A TINY PORTAL TO DELIGHT
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
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
          initial={{ opacity: 0 }}
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

function WanderingWorld() {
  const reduceMotion = useReducedMotion()
  const wanderers = [
    { glyph: '☾', left: '73%', top: '12%', size: 'text-7xl', delay: 0, drift: 34 },
    { glyph: '❋', left: '82%', top: '67%', size: 'text-5xl', delay: -2.2, drift: -26 },
    { glyph: '〰', left: '57%', top: '77%', size: 'text-6xl', delay: -4.8, drift: 38 },
    { glyph: '✧', left: '91%', top: '35%', size: 'text-4xl', delay: -1, drift: -22 },
    { glyph: '◒', left: '68%', top: '54%', size: 'text-5xl', delay: -5.7, drift: 24 },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {wanderers.map((wanderer) => (
        <motion.span
          key={wanderer.left}
          animate={reduceMotion ? { opacity: 0.48 } : { x: [0, wanderer.drift, -wanderer.drift * 0.35, 0], y: [0, -25, 18, 0], rotate: [0, 10, -7, 0], opacity: [0.28, 0.8, 0.4, 0.28] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: wanderer.delay }}
          className={`absolute ${wanderer.size} text-amber-100/70 drop-shadow-[0_0_18px_rgba(255,218,132,0.45)]`}
          style={{ left: wanderer.left, top: wanderer.top }}
        >
          {wanderer.glyph}
        </motion.span>
      ))}
      <motion.div
        animate={reduceMotion ? undefined : { x: ['-15%', '115%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-[16%] h-8 w-40 rounded-[50%] border border-amber-100/25 bg-amber-100/10 blur-[1px]"
      />
    </div>
  )
}
