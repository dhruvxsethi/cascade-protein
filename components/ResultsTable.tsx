'use client'
import { useState } from 'react'

interface DesignScores {
  activeSiteRmsd: number | null
  mpnnScore: number | null
  plddt: number | null
}

interface Design {
  _id: string
  designIndex: number
  sequence: string | null
  scores: DesignScores
  isValidated: boolean
  cifBlobUrl: string | null
}

type SortKey = 'plddt' | 'mpnnScore' | 'activeSiteRmsd'

function NavBar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
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

function PlddtBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = value > 70 ? 'bg-emerald-400' : value >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono font-semibold text-sm ${value > 70 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
        {value.toFixed(1)}
      </span>
      <div className="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CopyableSequence({ seq }: { seq: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(seq).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  const truncated = seq.length > 30 ? seq.slice(0, 30) + '…' : seq
  return (
    <div className="group flex items-center gap-1.5 max-w-xs">
      <span className="font-mono text-xs text-zinc-500 truncate" title={seq}>{truncated}</span>
      <button
        type="button"
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs shrink-0"
        title="Copy sequence"
      >
        {copied ? '✓' : '📋'}
      </button>
    </div>
  )
}

export default function ResultsTable({
  designs,
  jobId,
}: {
  designs: Design[]
  jobId: string
}) {
  const [sortBy, setSortBy] = useState<SortKey>('plddt')

  const sorted = [...designs].sort((a, b) => {
    const av = a.scores[sortBy] ?? 0
    const bv = b.scores[sortBy] ?? 0
    return sortBy === 'mpnnScore' ? av - bv : bv - av
  })

  const validated = designs.filter(d => d.isValidated)
  const bestPlddt = designs.reduce((best, d) => Math.max(best, d.scores.plddt ?? 0), 0)
  const avgMpnn =
    designs.filter(d => d.scores.mpnnScore !== null).reduce((sum, d) => sum + (d.scores.mpnnScore ?? 0), 0) /
    (designs.filter(d => d.scores.mpnnScore !== null).length || 1)

  const downloadAll = () => {
    const content = validated
      .map(
        d =>
          `>design_${d.designIndex} plddt=${d.scores.plddt?.toFixed(1) ?? 'n/a'} mpnn=${d.scores.mpnnScore?.toFixed(3) ?? 'n/a'}\n${d.sequence ?? ''}`
      )
      .join('\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validated_sequences_${jobId}.fa`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-1">Pipeline Results</h1>
            <p className="text-zinc-500 text-sm font-mono">Job: {jobId}</p>
          </div>
          <button
            type="button"
            onClick={downloadAll}
            disabled={validated.length === 0}
            className="shrink-0 flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
          >
            ↓ Download validated (.fa)
          </button>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total designs', value: designs.length, color: 'text-zinc-100', bg: 'bg-zinc-900' },
            { label: 'Validated (pLDDT > 70)', value: validated.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Best pLDDT', value: bestPlddt > 0 ? bestPlddt.toFixed(1) : '—', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Avg MPNN score', value: designs.length > 0 ? avgMpnn.toFixed(3) : '—', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-zinc-800 p-4 text-center`}>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-zinc-500 text-xs mr-1">Sort by:</span>
          {(['plddt', 'mpnnScore', 'activeSiteRmsd'] as SortKey[]).map(col => (
            <button
              type="button"
              key={col}
              onClick={() => setSortBy(col)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortBy === col
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {col === 'plddt' ? 'pLDDT' : col === 'mpnnScore' ? 'MPNN Score' : 'RMSD'}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {designs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-16 text-center">
            <div className="text-4xl mb-4 text-zinc-700">◈</div>
            <p className="text-zinc-400 font-medium mb-1">No results yet</p>
            <p className="text-zinc-600 text-sm">Check back once the pipeline completes</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">pLDDT</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">MPNN Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Active Site RMSD</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sequence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {sorted.map(d => (
                  <tr key={d._id} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">#{d.designIndex}</td>
                    <td className="px-4 py-3">
                      {d.scores.plddt !== null ? (
                        <PlddtBar value={d.scores.plddt} />
                      ) : (
                        <span className="text-zinc-600 font-mono text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-purple-400">
                      {d.scores.mpnnScore?.toFixed(3) ?? <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-zinc-400">
                      {d.scores.activeSiteRmsd?.toFixed(2) ?? <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.isValidated ? (
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md text-xs font-semibold">
                          ✓ Validated
                        </span>
                      ) : (
                        <span className="bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-md text-xs">
                          Filtered
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.sequence ? (
                        <CopyableSequence seq={d.sequence} />
                      ) : (
                        <span className="text-zinc-600 font-mono text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
