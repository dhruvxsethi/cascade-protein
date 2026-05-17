'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Download } from 'lucide-react'

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

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

function NavBar() {
  return (
    <nav className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
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

function PlddtBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = value > 70 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-red-400'
  const barColor = value > 70 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2.5">
      <span className={`font-mono font-bold text-sm tabular-nums ${color}`}>{value.toFixed(1)}</span>
      <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} opacity-60`}
          style={{ width: `${pct}%` }}
        />
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
    <div className="group flex items-center gap-1.5 max-w-[200px]">
      <span className="font-mono text-xs text-zinc-500 truncate" title={seq}>{truncated}</span>
      <button
        type="button"
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-zinc-300 shrink-0"
        title="Copy sequence"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span key="check" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <Copy className="w-3.5 h-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
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

  const SUMMARY_STATS = [
    { label: 'Total designs', value: designs.length, color: 'text-zinc-100', ring: 'ring-white/10' },
    { label: 'Validated', value: validated.length, color: 'text-emerald-400', ring: 'ring-emerald-500/20' },
    { label: 'Best pLDDT', value: bestPlddt > 0 ? bestPlddt.toFixed(1) : '—', color: 'text-blue-400', ring: 'ring-blue-500/20' },
    { label: 'Avg MPNN', value: designs.length > 0 ? avgMpnn.toFixed(3) : '—', color: 'text-indigo-400', ring: 'ring-indigo-500/20' },
  ]

  return (
    <div className="min-h-[100dvh] bg-[#050507] text-zinc-100">
      <NavBar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page header */}
        <motion.div
          className="flex items-start justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-1 tracking-tight">Pipeline Results</h1>
            <p className="text-zinc-600 text-sm font-mono tabular-nums">Job: {jobId}</p>
          </div>
          <button
            type="button"
            onClick={downloadAll}
            disabled={validated.length === 0}
            className="shrink-0 flex items-center gap-2 bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.97] px-5 py-2.5 rounded-full font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            <Download className="w-4 h-4" />
            Download validated (.fa)
          </button>
        </motion.div>

        {/* Summary bar: horizontal strip of stat pills */}
        <motion.div
          className="flex flex-wrap gap-2 mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.08 }}
        >
          {SUMMARY_STATS.map(stat => (
            <div
              key={stat.label}
              className={`ring-1 ${stat.ring} bg-zinc-900/60 rounded-full px-4 py-2 flex items-center gap-2`}
            >
              <span className={`font-mono font-bold text-sm tabular-nums ${stat.color}`}>{stat.value}</span>
              <span className="text-zinc-500 text-xs">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-zinc-500 text-xs mr-1">Sort by:</span>
          {(['plddt', 'mpnnScore', 'activeSiteRmsd'] as SortKey[]).map(col => (
            <button
              type="button"
              key={col}
              onClick={() => setSortBy(col)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
                sortBy === col
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-zinc-800/50 text-zinc-400 ring-1 ring-white/8 hover:text-zinc-200 hover:ring-white/15'
              }`}
            >
              {col === 'plddt' ? 'pLDDT' : col === 'mpnnScore' ? 'MPNN Score' : 'RMSD'}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {designs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ring-1 ring-white/8 rounded-[2rem] bg-zinc-900/40 p-16 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
              <Download className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">No results yet</p>
            <p className="text-zinc-600 text-sm">Check back once the pipeline completes</p>
          </motion.div>
        ) : (
          <div className="ring-1 ring-white/8 rounded-[2rem] overflow-hidden bg-zinc-900/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">pLDDT</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">MPNN Score</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">Active Site RMSD</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">Sequence</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sorted.map((d, i) => (
                    <motion.tr
                      key={d._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: i * 0.03 }}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-600 tabular-nums">#{d.designIndex}</td>
                      <td className="px-5 py-3.5">
                        {d.scores.plddt !== null ? (
                          <PlddtBar value={d.scores.plddt} />
                        ) : (
                          <span className="text-zinc-700 font-mono text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm text-indigo-400 tabular-nums">
                        {d.scores.mpnnScore?.toFixed(3) ?? <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm text-zinc-400 tabular-nums">
                        {d.scores.activeSiteRmsd?.toFixed(2) ?? <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {d.isValidated ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            <Check className="w-3 h-3" />
                            Validated
                          </span>
                        ) : (
                          <span className="bg-zinc-800/60 text-zinc-500 ring-1 ring-white/8 px-2.5 py-0.5 rounded-full text-xs">
                            Filtered
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {d.sequence ? (
                          <CopyableSequence seq={d.sequence} />
                        ) : (
                          <span className="text-zinc-700 font-mono text-xs">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
