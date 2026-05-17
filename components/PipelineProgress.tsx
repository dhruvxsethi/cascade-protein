'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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
const STAGE_LABELS: Record<string, string> = {
  rfd3: 'RFDiffusion3 — Generating structures',
  mpnn: 'ProteinMPNN — Generating sequences',
  af3: 'AlphaFold3 — Validating structures',
  complete: 'Complete',
}

export default function PipelineProgress({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobStats | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        setJob(data.job)
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

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const currentIdx = ORDERED_STAGES.indexOf(job.stage as typeof ORDERED_STAGES[number])

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">
        {job.stage === 'complete' ? 'Pipeline Complete' : 'Pipeline Running'}
      </h2>

      <div className="space-y-3 mb-8">
        {ORDERED_STAGES.map((stage, i) => {
          const isDone = currentIdx > i
          const isActive = job.stage === stage
          return (
            <div
              key={stage}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                isActive
                  ? 'bg-blue-50 border border-blue-200'
                  : isDone
                  ? 'bg-green-50'
                  : 'bg-gray-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{STAGE_LABELS[stage]}</p>
                {isActive && stage !== 'complete' && (
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <div className="bg-blue-500 h-1 rounded-full w-1/3 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{job.stats.rfd3Generated}</p>
          <p className="text-xs text-gray-500 mt-1">Structures</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{job.stats.mpnnGenerated}</p>
          <p className="text-xs text-gray-500 mt-1">Sequences</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{job.stats.af3Validated}</p>
          <p className="text-xs text-gray-500 mt-1">Validated</p>
        </div>
      </div>

      {job.stats.bestPlddt > 0 && (
        <div className="p-4 bg-green-50 rounded-lg text-center mb-6">
          <p className="text-sm text-green-700">
            Best pLDDT so far: <strong>{job.stats.bestPlddt.toFixed(1)}</strong>
          </p>
        </div>
      )}

      {job.stage === 'complete' && (
        <Link
          href={`/results/${jobId}`}
          className="block w-full bg-green-600 text-white py-3 rounded-xl font-medium text-center hover:bg-green-700"
        >
          View Results →
        </Link>
      )}

      {job.errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{job.errorMessage}</p>
        </div>
      )}
    </div>
  )
}
