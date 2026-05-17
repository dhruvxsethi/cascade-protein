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
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">Results</h2>
          <p className="text-gray-500 text-sm mt-1">
            {validated.length} validated designs (pLDDT &gt; 70) · {designs.length} total
          </p>
        </div>
        <button
          type="button"
          onClick={downloadAll}
          disabled={validated.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Download validated (.fa)
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['plddt', 'mpnnScore', 'activeSiteRmsd'] as SortKey[]).map(col => (
          <button
            type="button"
            key={col}
            onClick={() => setSortBy(col)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              sortBy === col ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {col === 'plddt' ? 'pLDDT' : col === 'mpnnScore' ? 'MPNN Score' : 'RMSD'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 font-medium">ID</th>
              <th className="text-left p-3 font-medium">pLDDT</th>
              <th className="text-left p-3 font-medium">MPNN Score</th>
              <th className="text-left p-3 font-medium">RMSD</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Sequence</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => (
              <tr key={d._id} className="hover:bg-gray-50 border-b last:border-0">
                <td className="p-3 font-mono text-xs text-gray-500">#{d.designIndex}</td>
                <td className="p-3">
                  <span
                    className={`font-bold ${
                      (d.scores.plddt ?? 0) > 70 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {d.scores.plddt?.toFixed(1) ?? '—'}
                  </span>
                </td>
                <td className="p-3 text-gray-600">{d.scores.mpnnScore?.toFixed(3) ?? '—'}</td>
                <td className="p-3 text-gray-600">{d.scores.activeSiteRmsd?.toFixed(2) ?? '—'}</td>
                <td className="p-3">
                  {d.isValidated ? (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                      Validated
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">
                      Filtered
                    </span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs max-w-xs truncate text-gray-500">
                  {d.sequence ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
