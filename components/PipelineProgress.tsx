'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

const STAGE_META: Record<string, { label: string; description: string; icon: string }> = {
  rfd3: { label: 'RFDiffusion3', description: 'Structure generation — diffusing backbone coordinates', icon: '⬡' },
  mpnn: { label: 'ProteinMPNN', description: 'Sequence design — inverse folding with graph neural nets', icon: '⬢' },
  af3: { label: 'AlphaFold3', description: 'Structure validation — predicting folded confirmation', icon: '◈' },
  complete: { label: 'Pipeline complete', description: 'All stages finished successfully', icon: '✓' },
}

function NavBar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
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

export default function PipelineProgress({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [job, setJob] = useState<JobStats | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
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

  // live "seconds since" counter
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsSince(Math.floor((Date.now() - lastUpdated) / 1000))
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  if (!job) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <NavBar />
        <div className="flex items-center justify-center h-[60vh] gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400">Loading pipeline status...</p>
        </div>
      </div>
    )
  }

  const currentIdx = ORDERED_STAGES.indexOf(job.stage as typeof ORDERED_STAGES[number])
  const isComplete = job.stage === 'complete'
  const isFailed = job.stage === 'failed'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-2">
                {isComplete ? 'Pipeline Complete' : isFailed ? 'Pipeline Failed' : 'Pipeline Running'}
              </h1>
              <p className="text-zinc-500 text-sm font-mono">Job ID: {jobId}</p>
            </div>
            {!isComplete && !isFailed && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Updated {secondsSince}s ago
              </div>
            )}
          </div>
        </div>

        {/* Error state */}
        {isFailed && job.errorMessage && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-5">
            <p className="text-red-400 font-semibold mb-1">Pipeline error</p>
            <p className="text-red-300/80 text-sm">{job.errorMessage}</p>
            <a href="mailto:support@cascade.bio" className="text-red-400 text-xs mt-3 inline-block hover:underline">
              Contact support →
            </a>
          </div>
        )}

        {/* Stage cards */}
        <div className="space-y-3 mb-8">
          {ORDERED_STAGES.map((stage, i) => {
            const isDone = currentIdx > i || (isComplete && stage === 'complete')
            const isActive = job.stage === stage && stage !== 'complete'
            const isPending = !isDone && !isActive
            const meta = STAGE_META[stage]

            return (
              <div
                key={stage}
                className={`rounded-xl border p-5 transition-all ${
                  isActive
                    ? 'bg-blue-500/10 border-blue-500/40'
                    : isDone
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon / status circle */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
                  }`}>
                    {isDone ? '✓' : isActive ? (
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={`font-semibold text-sm ${
                        isActive ? 'text-blue-300' : isDone ? 'text-emerald-400' : 'text-zinc-500'
                      }`}>
                        {meta.icon} {meta.label}
                      </p>
                      {isDone && (
                        <span className="text-emerald-400 text-xs font-medium shrink-0">✓ Complete</span>
                      )}
                      {isActive && (
                        <span className="text-blue-400 text-xs font-medium shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          Running
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isPending ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      {meta.description}
                    </p>
                    {isActive && (
                      <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full w-2/5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: 'Structures',
              value: job.stats.rfd3Generated,
              sub: `${job.stats.rfd3Passed} passed filter`,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              label: 'Sequences',
              value: job.stats.mpnnGenerated,
              sub: `${job.stats.mpnnPassed} passed`,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
            {
              label: 'Validated',
              value: job.stats.af3Validated,
              sub: 'pLDDT > 70',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl border border-zinc-800 p-4 text-center`}>
              <p className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              <p className="text-zinc-400 text-xs mt-1 font-medium">{stat.label}</p>
              <p className="text-zinc-600 text-xs mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Best pLDDT badge */}
        {job.stats.bestPlddt > 0 && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center shadow-lg shadow-emerald-500/5">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Best pLDDT score</p>
            <p className="text-5xl font-bold font-mono text-emerald-400">{job.stats.bestPlddt.toFixed(1)}</p>
            <p className="text-zinc-500 text-xs mt-2">out of 100 · higher is better</p>
          </div>
        )}

        {/* Complete CTA */}
        {isComplete && (
          <Link
            href={`/results/${jobId}`}
            className="block w-full bg-emerald-500 text-white py-4 rounded-xl font-semibold text-center hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 mb-6"
          >
            View Results →
          </Link>
        )}

        {/* Error message (non-failed, e.g. partial) */}
        {!isFailed && job.errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm font-medium">Error</p>
            <p className="text-red-300/80 text-sm mt-1">{job.errorMessage}</p>
          </div>
        )}

        {/* Cron / how it works */}
        {(job.stage === 'af3' || job.stage === 'mpnn') && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">How the pipeline progresses</p>
            <ul className="text-zinc-500 text-xs space-y-1.5">
              <li>⬡ <strong className="text-zinc-400">RFDiffusion3 + ProteinMPNN</strong> run on RunPod GPU — results arrive via callback when done</li>
              <li>◈ <strong className="text-zinc-400">AlphaFold3</strong> predictions are submitted to the AF3 Server API and polled automatically</li>
              <li>⏱ <strong className="text-zinc-400">Cron job</strong> checks for new AF3 results once daily (upgrade to Vercel Pro for every 5 min)</li>
              <li>📊 This page refreshes every 10 seconds to show the latest counts</li>
            </ul>
          </div>
        )}

        {/* Cancel button */}
        {!isComplete && !isFailed && (
          <div className="flex flex-col items-center gap-2 mb-6">
            {confirmCancel ? (
              <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-400 text-sm font-medium mb-3">Are you sure? This will terminate the GPU pod and stop the run.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-400 disabled:opacity-50 transition-colors"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, cancel run'}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="bg-zinc-800 text-zinc-300 px-5 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Keep running
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCancel}
                className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
              >
                Cancel run
              </button>
            )}
          </div>
        )}

        {/* Auto-refresh indicator */}
        {!isComplete && !isFailed && (
          <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
            Auto-refreshing every 10s · next check in {countdown}s
          </div>
        )}
      </div>
    </div>
  )
}
