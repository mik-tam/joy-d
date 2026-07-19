import { motion } from 'framer-motion'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { SmileCamera } from '../components/SmileCamera/SmileCamera'

export function Home() {
  const [screen, setScreen] = useState<'welcome' | 'camera'>('welcome')

  if (screen === 'camera') {
    return <SmileCamera onBack={() => setScreen('welcome')} />
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1b1033] px-6 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_18%,rgba(253,179,255,0.27),transparent_30%),radial-gradient(circle_at_80%_22%,rgba(255,191,117,0.25),transparent_25%),radial-gradient(circle_at_50%_90%,rgba(119,220,205,0.24),transparent_30%)]" />
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

      <section className="w-full max-w-2xl text-center">
        <motion.p
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.32em] text-amber-100/80"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          A TINY PORTAL TO DELIGHT
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 shadow-2xl shadow-purple-950/45 backdrop-blur-xl sm:p-14"
        >
          <div className="mx-auto mb-8 flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-rose-300 to-fuchsia-400 text-5xl shadow-lg shadow-rose-950/30">
            :D
          </div>
          <h1 className="font-serif text-6xl font-black tracking-[-0.08em] text-white sm:text-8xl">
            JOY<span className="text-amber-200">:</span>D
          </h1>
          <p className="mx-auto mt-7 max-w-md text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
            Every smile opens a new world.
          </p>
          <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-white/70">
            A whimsical little adventure is waiting on the other side of your smile.
          </p>

          <button
            type="button"
            onClick={() => setScreen('camera')}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-amber-100 px-6 py-3.5 font-bold text-purple-950 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100/40"
          >
            Begin adventure
            <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-8 text-sm text-white/55"
        >
          Your smile is the key. The rest is a surprise.
        </motion.p>
      </section>
    </main>
  )
}
