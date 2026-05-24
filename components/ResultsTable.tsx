'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Download } from 'lucide-react'
import Nav from './Nav'

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

function PlddtBadge({ value }: { value: number }) {
  const isGood   = value >= 70
  const isMedium = value >= 50 && value < 70
  const color  = isGood ? '#10B981' : isMedium ? '#F59E0B' : '#EF4444'
  const bg     = isGood ? 'rgba(16,185,129,0.1)' : isMedium ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
  const border = isGood ? 'rgba(16,185,129,0.25)' : isMedium ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'
  const pct    = Math.min(100, Math.max(0, value))

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="font-mono font-bold text-xs px-2 py-0.5 rounded-full tabular-nums"
        style={{ background: bg, color, border: `1px solid ${border}` }}
      >
        {value.toFixed(1)}
      </span>
      <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: '#1A2236' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
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
  const truncated = seq.length > 28 ? seq.slice(0, 28) + '…' : seq
  return (
    <div className="group flex items-center gap-1.5 max-w-[180px]">
      <span className="font-mono text-xs truncate" style={{ color: '#8A94A8' }} title={seq}>{truncated}</span>
      <button
        type="button"
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: '#4A5568' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#8A94A8')}
        onMouseLeave={e => (e.currentTarget.style.color = '#4A5568')}
        title="Copy sequence"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span key="check" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <Check className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
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

export default function ResultsTable({ designs, jobId }: { designs: Design[]; jobId: string }) {
  const [sortBy, setSortBy] = useState<SortKey>('plddt')

  const sorted = [...designs].sort((a, b) => {
    const av = a.scores[sortBy] ?? 0
    const bv = b.scores[sortBy] ?? 0
    return sortBy === 'mpnnScore' ? av - bv : bv - av
  })

  const validated = designs.filter(d => d.isValidated)
  const bestPlddt = designs.reduce((best, d) => Math.max(best, d.scores.plddt ?? 0), 0)
  const avgMpnn = designs.filter(d => d.scores.mpnnScore !== null)
    .reduce((sum, d) => sum + (d.scores.mpnnScore ?? 0), 0) /
    (designs.filter(d => d.scores.mpnnScore !== null).length || 1)

  const downloadAll = () => {
    const content = validated
      .map(d => `>design_${d.designIndex} plddt=${d.scores.plddt?.toFixed(1) ?? 'n/a'} mpnn=${d.scores.mpnnScore?.toFixed(3) ?? 'n/a'}\n${d.sequence ?? ''}`)
      .join('\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validated_sequences_${jobId}.fa`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SORT_COLS: { key: SortKey; label: string }[] = [
    { key: 'plddt',         label: 'Boltz-2 pLDDT' },
    { key: 'mpnnScore',     label: 'MPNN Score'     },
    { key: 'activeSiteRmsd', label: 'RMSD'          },
  ]

  return (
    <div className="min-h-[100dvh]" style={{ background: '#080C14', color: '#E2E8F0' }}>
      <Nav jobId={jobId} />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <motion.div
          className="flex items-start justify-between gap-4 mb-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                Complete
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#E2E8F0' }}>Pipeline Results</h1>
            <p className="text-xs font-mono" style={{ color: '#4A5568' }}>Job: {jobId}</p>
          </div>
          <button
            type="button"
            onClick={downloadAll}
            disabled={validated.length === 0}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Download className="w-4 h-4" />
            Download FASTA ({validated.length})
          </button>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          className="grid grid-cols-4 gap-3 mb-7"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.07 }}
        >
          {[
            { label: 'Total designs', value: designs.length,                                      color: '#E2E8F0', dim: '#131928',                     dimBorder: '#1A2236' },
            { label: 'Validated',     value: validated.length,                                    color: '#10B981', dim: 'rgba(16,185,129,0.1)',        dimBorder: 'rgba(16,185,129,0.2)' },
            { label: 'Best pLDDT',    value: bestPlddt > 0 ? bestPlddt.toFixed(1) : '—',        color: '#3B82F6', dim: 'rgba(59,130,246,0.1)',         dimBorder: 'rgba(59,130,246,0.2)' },
            { label: 'Avg MPNN',      value: designs.length > 0 ? avgMpnn.toFixed(3) : '—',     color: '#818CF8', dim: 'rgba(129,140,248,0.1)',        dimBorder: 'rgba(129,140,248,0.2)' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4 text-center" style={{ background: stat.dim, border: `1px solid ${stat.dimBorder}` }}>
              <p className="text-2xl font-bold font-mono tabular-nums mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs" style={{ color: '#4A5568' }}>{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium" style={{ color: '#4A5568' }}>Sort:</span>
          {SORT_COLS.map(col => (
            <button
              key={col.key}
              type="button"
              onClick={() => setSortBy(col.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.97]"
              style={sortBy === col.key
                ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
                : { background: '#0D1220', color: '#8A94A8', border: '1px solid #1A2236' }
              }
            >
              {col.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {designs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl p-16 text-center"
            style={{ background: '#0D1220', border: '1px solid #1A2236' }}
          >
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#131928', border: '1px solid #1A2236' }}>
              <Download className="w-5 h-5" style={{ color: '#4A5568' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#8A94A8' }}>No results yet</p>
            <p className="text-xs" style={{ color: '#4A5568' }}>Check back once the pipeline completes</p>
          </motion.div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: '#0D1220', border: '1px solid #1A2236' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1A2236' }}>
                  {['#', 'Boltz-2 pLDDT', 'MPNN Score', 'Active Site RMSD', 'Status', 'Sequence'].map(col => (
                    <th
                      key={col}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: '#4A5568' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sorted.map((d, i) => (
                    <motion.tr
                      key={d._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: i * 0.025 }}
                      style={{ borderBottom: i < sorted.length - 1 ? '1px solid #1A2236' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3 font-mono text-xs tabular-nums" style={{ color: '#4A5568' }}>#{d.designIndex}</td>
                      <td className="px-4 py-3">
                        {d.scores.plddt !== null
                          ? <PlddtBadge value={d.scores.plddt} />
                          : <span className="font-mono text-xs" style={{ color: '#4A5568' }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums" style={{ color: '#818CF8' }}>
                        {d.scores.mpnnScore?.toFixed(3) ?? <span style={{ color: '#4A5568' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums" style={{ color: '#8A94A8' }}>
                        {d.scores.activeSiteRmsd?.toFixed(2) ?? <span style={{ color: '#4A5568' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {d.isValidated ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
                          >
                            <Check className="w-3 h-3" />
                            Validated
                          </span>
                        ) : (
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full"
                            style={{ background: '#131928', color: '#4A5568', border: '1px solid #1A2236' }}
                          >
                            Filtered
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {d.sequence ? <CopyableSequence seq={d.sequence} /> : <span className="font-mono text-xs" style={{ color: '#4A5568' }}>—</span>}
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
