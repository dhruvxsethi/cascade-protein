'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Dna, Layers, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import Nav from './Nav'

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

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

const STAGES = [
  { key: 'rfd3',  label: 'RFDiffusion3', sub: 'Backbone generation', Icon: Dna,    color: '#3B82F6', dim: 'rgba(59,130,246,0.12)',  dimBorder: 'rgba(59,130,246,0.25)'  },
  { key: 'mpnn',  label: 'ProteinMPNN',  sub: 'Sequence design',     Icon: Layers, color: '#818CF8', dim: 'rgba(129,140,248,0.12)', dimBorder: 'rgba(129,140,248,0.25)' },
  { key: 'af3',   label: 'Boltz-2',      sub: 'Structure validation', Icon: Zap,    color: '#10B981', dim: 'rgba(16,185,129,0.12)',  dimBorder: 'rgba(16,185,129,0.25)'  },
] as const

function StatusBadge({ status }: { status: 'done' | 'active' | 'pending' | 'failed' }) {
  const map = {
    done:    { label: 'Complete', bg: 'rgba(16,185,129,0.12)',  color: '#10B981', border: 'rgba(16,185,129,0.25)'  },
    active:  { label: 'Running',  bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', border: 'rgba(59,130,246,0.25)'  },
    pending: { label: 'Pending',  bg: 'rgba(74,85,109,0.12)',   color: '#4A5568', border: '#1A2236'                 },
    failed:  { label: 'Failed',   bg: 'rgba(239,68,68,0.12)',   color: '#F87171', border: 'rgba(239,68,68,0.25)'   },
  }
  const s = map[status]
  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status === 'active' && (
        <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: s.color }} />
      )}
      {s.label}
    </span>
  )
}

function SkeletonLoader({ jobId }: { jobId: string }) {
  return (
    <div className="min-h-[100dvh]" style={{ background: '#080C14' }}>
      <Nav jobId={jobId} />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-5">
        <div className="shimmer h-8 w-52 rounded-lg" />
        <div className="shimmer h-4 w-36 rounded" />
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[1,2,3].map(i => (
            <div key={i} className="shimmer rounded-xl h-32" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="shimmer rounded-xl h-24" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PipelineProgress({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [job, setJob] = useState<JobStats | null>(null)
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [secondsSince, setSecondsSince] = useState(0)
  const [countdown, setCountdown] = useState(10)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

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

  if (!job) return <SkeletonLoader jobId={jobId} />

  const isComplete = job.stage === 'complete'
  const isFailed   = job.stage === 'failed'
  const orderedStages = ['rfd3', 'mpnn', 'af3'] as const
  const currentIdx = orderedStages.indexOf(job.stage as typeof orderedStages[number])

  return (
    <div className="min-h-[100dvh]" style={{ background: '#080C14', color: '#E2E8F0' }}>
      <Nav jobId={jobId} />

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <motion.div
          className="flex items-start justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isComplete ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>Complete</span>
              ) : isFailed ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>Failed</span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#3B82F6' }} />
                  Running
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#E2E8F0' }}>
              {isComplete ? 'Pipeline Complete' : isFailed ? 'Pipeline Failed' : 'Pipeline Running'}
            </h1>
            <p className="text-xs font-mono" style={{ color: '#4A5568' }}>Job ID: {jobId}</p>
          </div>

          {!isComplete && !isFailed && (
            <div
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full shrink-0"
              style={{ background: '#0D1220', border: '1px solid #1A2236', color: '#8A94A8' }}
            >
              Updated {secondsSince}s ago · refresh in {countdown}s
            </div>
          )}
        </motion.div>

        {/* Error state */}
        {isFailed && job.errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="mb-6 rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#F87171' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#F87171' }}>Pipeline error</p>
              <p className="text-sm" style={{ color: 'rgba(248,113,113,0.8)' }}>{job.errorMessage}</p>
            </div>
          </motion.div>
        )}

        {/* Stage cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {STAGES.map(({ key, label, sub, Icon, color, dim, dimBorder }, i) => {
            const isDone    = isComplete || (currentIdx !== -1 && currentIdx > i)
            const isActive  = !isComplete && job.stage === key
            const isPending = !isDone && !isActive && !isFailed

            const status: 'done' | 'active' | 'pending' | 'failed' = isDone ? 'done' : isActive ? 'active' : 'pending'

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.07 }}
                className="rounded-xl p-5"
                style={{
                  background: '#0D1220',
                  border: `1px solid ${isActive ? 'rgba(59,130,246,0.3)' : isDone ? 'rgba(16,185,129,0.2)' : '#1A2236'}`,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isDone ? 'rgba(16,185,129,0.12)' : isActive ? dim : '#131928', border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : isActive ? dimBorder : '#1A2236'}` }}
                  >
                    {isDone
                      ? <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                      : <Icon className="w-5 h-5" style={{ color: isActive ? color : '#4A5568' }} />
                    }
                  </div>
                  <StatusBadge status={status} />
                </div>

                <p className="text-sm font-semibold mb-0.5" style={{ color: isDone ? '#10B981' : isActive ? '#E2E8F0' : '#4A5568' }}>
                  {label}
                </p>
                <p className="text-xs" style={{ color: '#4A5568' }}>{sub}</p>

                {isActive && (
                  <div className="mt-3 h-px overflow-hidden rounded-full" style={{ background: '#1A2236' }}>
                    <motion.div
                      className="h-full w-1/3 rounded-full"
                      style={{ background: color }}
                      animate={{ x: ['-200%', '400%'] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                    />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.25 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          {[
            { label: 'Backbones',  value: job.stats.rfd3Generated,  sub: `${job.stats.rfd3Passed} passed filter`, color: '#3B82F6',  dim: 'rgba(59,130,246,0.1)'  },
            { label: 'Sequences',  value: job.stats.mpnnGenerated,  sub: `${job.stats.mpnnPassed} passed filter`, color: '#818CF8',  dim: 'rgba(129,140,248,0.1)' },
            { label: 'Validated',  value: job.stats.af3Validated,   sub: 'pLDDT > 70',                            color: '#10B981',  dim: 'rgba(16,185,129,0.1)'  },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl p-4 text-center"
              style={{ background: stat.dim, border: `1px solid ${stat.color}22` }}
            >
              <p className="text-3xl font-bold font-mono tabular-nums mb-1" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-xs font-medium mb-0.5" style={{ color: '#8A94A8' }}>{stat.label}</p>
              <p className="text-xs" style={{ color: '#4A5568' }}>{stat.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Best pLDDT */}
        <AnimatePresence>
          {job.stats.bestPlddt > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="mb-5 rounded-xl p-5 flex items-center justify-between"
              style={{ background: '#0D1220', border: '1px solid #1A2236' }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#4A5568' }}>Best Boltz-2 pLDDT Score</p>
                <p className="text-xs" style={{ color: '#4A5568' }}>Higher is better · &gt;70 considered validated</p>
              </div>
              <p className="text-5xl font-bold font-mono tabular-nums" style={{ color: '#10B981' }}>
                {job.stats.bestPlddt.toFixed(1)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complete CTA */}
        {isComplete && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="mb-5">
            <Link
              href={`/results/${jobId}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98]"
              style={{ background: '#10B981' }}
            >
              View Results
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </motion.div>
        )}

        {/* Cancel */}
        {!isComplete && !isFailed && (
          <div className="flex flex-col items-center gap-2 mb-5">
            <AnimatePresence mode="wait">
              {confirmCancel ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING}
                  className="w-full rounded-xl p-4 text-center"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <p className="text-sm font-medium mb-4" style={{ color: '#F87171' }}>
                    This will terminate the GPU pod and stop the run.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: '#EF4444' }}
                    >
                      {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: '#131928', color: '#8A94A8', border: '1px solid #1A2236' }}
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
                  className="text-sm transition-colors"
                  style={{ color: '#4A5568' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4A5568')}
                >
                  Cancel run
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Refresh indicator */}
        {!isComplete && !isFailed && (
          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#4A5568' }}>
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#4A5568' }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
            Auto-refreshing · next check in {countdown}s
          </div>
        )}
      </div>
    </div>
  )
}
