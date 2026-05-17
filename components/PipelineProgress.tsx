'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Dna, Layers, Zap, CheckCircle, ChevronDown, ChevronRight, ArrowRight, AlertCircle } from 'lucide-react'

interface JobStats {
  stage: string
  stats: {
    rfd3Generated: number
    rfd3Passed: number
    mpnnGenerated: number
    mpnnPassed: number
    af3Validated: number
    bestPlddt: number
  }
  errorMessage: string | null
}

const ORDERED_STAGES = ['rfd3', 'mpnn', 'af3', 'complete'] as const

const STAGE_META: Record<string, { label: string; description: string; Icon: React.ElementType }> = {
  rfd3: { label: 'RFDiffusion3', description: 'Structure generation — diffusing backbone coordinates', Icon: Dna },
  mpnn: { label: 'ProteinMPNN', description: 'Sequence design — inverse folding with graph neural nets', Icon: Layers },
  af3: { label: 'AlphaFold3', description: 'Structure validation — predicting folded confirmation', Icon: Zap },
  complete: { label: 'Pipeline complete', description: 'All stages finished successfully', Icon: CheckCircle },
}

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

function NavBar() {
  return (
    <nav className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
          C
        </div>
        <div>
          <span className="text-zinc-100 font-semibold text-sm">Cascade</span>
          <span className="text-zinc-500 text-xs ml-2">Protein Design Pipeline</span>
        </div>
      </div>
    </nav>
  )
}

function SkeletonLoader() {
  return (
    <div className="min-h-[100dvh] bg-[#050507] text-zinc-100">
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-4">
        <div className="shimmer h-9 w-56 rounded-2xl" />
        <div className="shimmer h-4 w-36 rounded-xl" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="ring-1 ring-white/10 p-1.5 rounded-[2rem] bg-white/[0.02]">
              <div className="rounded-[calc(2rem-6px)] bg-zinc-900 p-5 shimmer h-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PipelineProgress({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [job, setJob] = useState<JobStats | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  const [secondsSince, setSecondsSince] = useState(0)
  const [countdown, setCountdown] = useState(10)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [showCronInfo, setShowCronInfo] = useState(false)

  const handleCancel = async () => {
    if (!confirmCancel) { setConfirmCancel(true); return }
    setCancelling(true)
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
      router.push('/')
    } catch {
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        setJob(data.job)
        setLastUpdated(Date.now())
        setSecondsSince(0)
        setCountdown(10)
        if (data.job.stage !== 'complete' && data.job.stage !== 'failed') {
          setTimeout(poll, 10_000)
        }
      } catch {
        if (!cancelled) setTimeout(poll, 30_000)
      }
    }

    poll()
    return () => { cancelled = true }
  }, [jobId])

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsSince(Math.floor((Date.now() - lastUpdated) / 1000))
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  if (!job) return <SkeletonLoader />

  const currentIdx = ORDERED_STAGES.indexOf(job.stage as typeof ORDERED_STAGES[number])
  const isComplete = job.stage === 'complete'
  const isFailed = job.stage === 'failed'

  return (
    <div className="min-h-[100dvh] bg-[#050507] text-zinc-100">
      <NavBar />

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header row */}
        <motion.div
          className="flex items-start justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">
              {isComplete ? 'Pipeline Complete' : isFailed ? 'Pipeline Failed' : 'Pipeline Running'}
            </h1>
            <p className="text-zinc-600 text-sm font-mono tabular-nums">Job: {jobId}</p>
          </div>
          {!isComplete && !isFailed && (
            <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1 shrink-0 bg-zinc-900/60 rounded-full px-3 py-1.5 ring-1 ring-white/8">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
              Updated {secondsSince}s ago
            </div>
          )}
        </motion.div>

        {/* Error state */}
        {isFailed && job.errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="mb-8 ring-1 ring-red-500/30 p-1.5 rounded-[2rem] bg-red-500/5"
          >
            <div className="rounded-[calc(2rem-6px)] bg-red-950/30 p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold mb-1 text-sm">Pipeline error</p>
                <p className="text-red-300/80 text-sm">{job.errorMessage}</p>
                <a href="mailto:support@cascade.bio" className="text-red-400 text-xs mt-3 inline-flex items-center gap-1 hover:underline">
                  Contact support <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bento grid: stages in a row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {ORDERED_STAGES.filter(s => s !== 'complete').map((stage, i) => {
            const isDone = currentIdx > i || isComplete
            const isActive = job.stage === stage
            const isPending = !isDone && !isActive
            const meta = STAGE_META[stage]
            const Icon = meta.Icon

            return (
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.08 }}
              >
                <div className={`ring-1 p-1.5 rounded-[2rem] transition-all ${
                  isActive
                    ? 'ring-blue-500/30 bg-blue-500/5'
                    : isDone
                    ? 'ring-emerald-500/20 bg-emerald-500/5'
                    : 'ring-white/8 bg-white/[0.02]'
                }`}>
                  <div className={`rounded-[calc(2rem-6px)] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] ${
                    isActive ? 'bg-zinc-900' : isDone ? 'bg-zinc-900' : 'bg-zinc-900'
                  }`}>
                    {/* Icon + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isDone
                          ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30'
                          : isActive
                          ? 'bg-blue-500/15 ring-1 ring-blue-500/30'
                          : 'bg-zinc-800 ring-1 ring-white/8'
                      }`}>
                        {isDone ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : isActive ? (
                          <Icon className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Icon className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${
                        isDone ? 'text-emerald-400' : isActive ? 'text-blue-400' : 'text-zinc-600'
                      }`}>
                        {isDone ? (
                          <span>Complete</span>
                        ) : isActive ? (
                          <>
                            <motion.div
                              className="w-1.5 h-1.5 rounded-full bg-blue-400"
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                            />
                            Running
                          </>
                        ) : (
                          <span>Pending</span>
                        )}
                      </div>
                    </div>

                    <p className={`font-semibold text-sm mb-1 ${
                      isActive ? 'text-blue-200' : isDone ? 'text-emerald-300' : 'text-zinc-500'
                    }`}>
                      {meta.label}
                    </p>
                    <p className={`text-xs leading-relaxed ${isPending ? 'text-zinc-700' : 'text-zinc-500'}`}>
                      {meta.description}
                    </p>

                    {/* Indeterminate progress bar for active stage */}
                    {isActive && (
                      <div className="mt-4 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full w-1/3 bg-blue-500 rounded-full"
                          animate={{ x: ['-200%', '400%'] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
          {[
            {
              label: 'Structures',
              value: job.stats.rfd3Generated,
              sub: `${job.stats.rfd3Passed} passed`,
              color: 'text-blue-400',
              bg: 'bg-blue-500/8',
              ring: 'ring-blue-500/15',
            },
            {
              label: 'Sequences',
              value: job.stats.mpnnGenerated,
              sub: `${job.stats.mpnnPassed} passed`,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/8',
              ring: 'ring-indigo-500/15',
            },
            {
              label: 'Validated',
              value: job.stats.af3Validated,
              sub: 'pLDDT > 70',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/8',
              ring: 'ring-emerald-500/15',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className={`${stat.bg} ring-1 ${stat.ring} rounded-2xl p-4 text-center`}
            >
              <p className={`text-3xl font-bold font-mono tabular-nums ${stat.color}`}>{stat.value}</p>
              <p className="text-zinc-400 text-xs mt-1 font-medium">{stat.label}</p>
              <p className="text-zinc-600 text-xs mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Best pLDDT card */}
        <AnimatePresence>
          {job.stats.bestPlddt > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="mb-6 ring-1 ring-white/10 p-1.5 rounded-[2rem] bg-white/[0.02]"
            >
              <div className="rounded-[calc(2rem-6px)] bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-5 text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Best pLDDT score</p>
                <p className="text-5xl font-bold font-mono tabular-nums text-emerald-400">{job.stats.bestPlddt.toFixed(1)}</p>
                <p className="text-zinc-600 text-xs mt-2">out of 100 · higher is better</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complete CTA */}
        {isComplete && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <Link
              href={`/results/${jobId}`}
              className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white py-4 rounded-full font-semibold text-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-lg shadow-blue-500/20 mb-6"
            >
              View Results
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Error message (non-failed) */}
        {!isFailed && job.errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <p className="text-red-400 text-sm font-medium">Error</p>
            <p className="text-red-300/80 text-sm mt-1">{job.errorMessage}</p>
          </div>
        )}

        {/* Cron / how it works — accordion */}
        {(job.stage === 'af3' || job.stage === 'mpnn') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6 ring-1 ring-white/8 rounded-2xl overflow-hidden bg-zinc-900/40"
          >
            <button
              type="button"
              onClick={() => setShowCronInfo(!showCronInfo)}
              className="w-full flex items-center justify-between px-5 py-4 text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-medium"
            >
              How this pipeline works
              {showCronInfo
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />
              }
            </button>
            <AnimatePresence>
              {showCronInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-3">
                    {[
                      { Icon: Dna, title: 'RFDiffusion3 + ProteinMPNN', body: 'Run on RunPod GPU — results arrive via callback when done.' },
                      { Icon: Zap, title: 'AlphaFold3', body: 'Predictions submitted to the AF3 Server API and polled automatically.' },
                      { Icon: Layers, title: 'Cron job', body: 'Checks for new AF3 results once daily (upgrade to Vercel Pro for every 5 min).' },
                    ].map(item => {
                      const Icon = item.Icon
                      return (
                        <div key={item.title} className="flex items-start gap-3">
                          <Icon className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-zinc-300 text-xs font-semibold">{item.title}</p>
                            <p className="text-zinc-600 text-xs mt-0.5">{item.body}</p>
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                      <p className="text-zinc-600 text-xs">This page refreshes every 10s to show the latest counts.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Cancel button */}
        {!isComplete && !isFailed && (
          <div className="flex flex-col items-center gap-2 mb-6">
            <AnimatePresence mode="wait">
              {confirmCancel ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={SPRING}
                  className="w-full ring-1 ring-red-500/30 rounded-2xl p-5 text-center bg-red-500/5"
                >
                  <p className="text-red-400 text-sm font-medium mb-4">This will terminate the GPU pod and stop the run.</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="bg-red-500 hover:bg-red-400 active:scale-[0.97] text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    >
                      {cancelling ? 'Cancelling...' : 'Yes, cancel run'}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="bg-zinc-800/80 text-zinc-300 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-700/80 transition-all ring-1 ring-white/8"
                    >
                      Keep running
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="cancel"
                  onClick={handleCancel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
                >
                  Cancel run
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {!isComplete && !isFailed && (
          <div className="flex items-center justify-center gap-2 text-zinc-700 text-xs">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-zinc-700"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
            Auto-refreshing every 10s · next check in {countdown}s
          </div>
        )}
      </div>
    </div>
  )
}
