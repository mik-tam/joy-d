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
      <LayeredLanding />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(30,16,58,0.92)_0%,rgba(38,20,64,0.68)_43%,rgba(26,13,49,0.12)_100%)]" />
      <div className="joy-paper-grain absolute inset-0 -z-10" aria-hidden="true" />

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

function LayeredLanding() {
  const reduceMotion = useReducedMotion()
  const flowers = [
    { left: '68%', bottom: '18%', color: '#f6a2b9', delay: -0.6, size: 56 },
    { left: '86%', bottom: '30%', color: '#ffcf78', delay: -2.7, size: 42 },
    { left: '77%', bottom: '10%', color: '#c3a7fa', delay: -4.1, size: 70 },
    { left: '94%', bottom: '12%', color: '#f4b2d4', delay: -1.4, size: 48 },
  ]
  const stars = Array.from({ length: 13 }, (_, index) => ({ left: `${46 + ((index * 13) % 51)}%`, top: `${7 + ((index * 17) % 44)}%`, delay: -index * 0.46 }))

  return (
    <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_82%,#f7a169_0%,#b65f82_24%,#493665_52%,#171033_100%)]" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 140 }}
        animate={reduceMotion ? { opacity: 0.9 } : { opacity: 0.9, x: [140, 0, 24, 0] }}
        transition={{ duration: 13, ease: 'easeOut' }}
        className="absolute right-[10%] top-[7%] size-32 rounded-full bg-[#ffe8a5] shadow-[0_0_0_14px_rgba(255,222,152,0.13),0_0_75px_rgba(255,210,136,0.55)]"
      />
      {stars.map((star, index) => (
        <motion.span
          key={index}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.2 }}
          animate={reduceMotion ? { opacity: 0.7 } : { opacity: [0.15, 1, 0.2], scale: [0.5, 1.35, 0.6], y: [0, -14, 0] }}
          transition={{ duration: 3.4 + (index % 3), repeat: Infinity, delay: star.delay }}
          className="absolute text-amber-100 drop-shadow-[0_0_10px_rgba(255,224,149,0.9)]"
          style={{ left: star.left, top: star.top }}
        >
          {index % 3 === 0 ? '✦' : '·'}
        </motion.span>
      ))}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={`cloud-${index}`}
          initial={reduceMotion ? false : { x: index === 1 ? '105vw' : '-45vw', opacity: 0 }}
          animate={reduceMotion ? { opacity: 0.34, x: index === 1 ? '58vw' : `${46 + index * 13}vw` } : { x: index === 1 ? ['105vw', '45vw', '68vw'] : ['-45vw', `${38 + index * 16}vw`, `${55 + index * 12}vw`], opacity: [0, 0.44, 0.18] }}
          transition={{ duration: 20 + index * 7, repeat: Infinity, ease: 'easeInOut', delay: -index * 4.5 }}
          className="absolute top-[18%] h-24 w-72 rounded-[50%] bg-[#ffd9d0]/35 blur-[1px] before:absolute before:-left-10 before:top-7 before:size-24 before:rounded-full before:bg-[#ffd9d0]/35 after:absolute after:right-7 after:-top-7 after:size-28 after:rounded-full after:bg-[#ffd9d0]/35"
        />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={`wave-${index}`}
          initial={reduceMotion ? false : { x: index % 2 ? '100%' : '-100%' }}
          animate={reduceMotion ? { x: 0 } : { x: index % 2 ? ['100%', '-4%', '12%'] : ['-100%', '4%', '-12%'] }}
          transition={{ duration: 12 + index * 3.5, repeat: Infinity, ease: 'easeInOut', delay: -index * 2 }}
          className="absolute -left-[12%] h-44 w-[124%] rounded-[48%] border-t border-white/20"
          style={{ bottom: `${-2 + index * 9}%`, background: ['#0d506b', '#126d7b', '#1d8a8e', '#64b7ad'][index], opacity: 0.94 - index * 0.1, transform: `rotate(${index % 2 ? 2 : -2}deg)` }}
        />
      ))}
      {flowers.map((flower, index) => (
        <motion.div
          key={flower.left}
          initial={reduceMotion ? false : { opacity: 0, y: 100, rotate: -16 }}
          animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -15, 0], rotate: [-7, 7, -7] }}
          transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut', delay: flower.delay }}
          className="absolute grid place-items-center rounded-full"
          style={{ left: flower.left, bottom: flower.bottom, width: flower.size, height: flower.size, background: `radial-gradient(circle, #ffe99c 0 16%, transparent 17%), conic-gradient(from 0deg, ${flower.color} 0 12%, transparent 12% 20%, ${flower.color} 20% 32%, transparent 32% 40%, ${flower.color} 40% 52%, transparent 52% 60%, ${flower.color} 60% 72%, transparent 72% 80%, ${flower.color} 80% 92%, transparent 92%)`, filter: 'drop-shadow(0 6px 8px rgba(28,10,50,.3))' }}
        />
      ))}
      <motion.img
        src="/art/lantern-boat.png"
        alt=""
        initial={reduceMotion ? false : { opacity: 0, x: '120vw', y: 25, rotate: 8 }}
        animate={reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 1, x: ['120vw', '7vw', '11vw', '7vw'], y: [25, 0, -14, 0], rotate: [8, -3, 2, -3] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[8%] right-[4%] w-[min(38vw,31rem)] drop-shadow-[0_22px_25px_rgba(12,4,38,0.46)]"
      />
    </div>
  )
}
