'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'

const DESIGN_OPTIONS = [100, 500, 1000, 5000]

export default function UploadForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [designCount, setDesignCount] = useState(100)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [params, setParams] = useState({
    cfg_scale: 2.0,
    step_scale: 1.5,
    num_timesteps: 200,
    sampling_temp: 0.1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.pdb')) {
      setFile(f)
      setError('')
    } else {
      setError('Please upload a .pdb file')
    }
  }, [])

  const handleSubmit = async () => {
    if (!file) return setError('Please select a PDB file')
    setLoading(true)
    setError('')

    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdbBlobUrl: blob.url,
          pdbFileName: file.name,
          designCount,
          ...params,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start job')
      router.push(`/dashboard/${data.jobId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLoading(false)
    }
  }

  const estimatedHours = Math.max(1, Math.ceil(designCount / 60))
  const estimatedCost = (estimatedHours * 0.74).toFixed(2)

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Protein Design Pipeline</h1>
      <p className="text-gray-500 mb-8">Upload a PDB file to generate designed variants</p>

      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition-colors mb-6"
        onClick={() => document.getElementById('pdb-input')?.click()}
        role="button"
        aria-label="Upload PDB file"
      >
        <input
          id="pdb-input"
          type="file"
          accept=".pdb"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) { setFile(f); setError('') }
          }}
        />
        {file ? (
          <p className="text-green-600 font-medium">✓ {file.name}</p>
        ) : (
          <div>
            <p className="text-gray-400 mb-1">Drag & drop your .pdb file here</p>
            <p className="text-gray-300 text-sm">or click to browse</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Number of designs</label>
        <div className="flex gap-3">
          {DESIGN_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setDesignCount(n)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                designCount === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {n.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-600 mb-4 hover:underline"
      >
        {showAdvanced ? '▲ Hide' : '▼ Show'} advanced parameters
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          {(Object.entries(params) as [keyof typeof params, number][]).map(([key, val]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{key}</label>
              <input
                type="number"
                step="0.1"
                value={val}
                onChange={e =>
                  setParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))
                }
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <strong>Estimated:</strong> ~{estimatedHours} hour{estimatedHours !== 1 ? 's' : ''} · ~${estimatedCost} GPU cost
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !file}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Starting pipeline...' : 'Run Pipeline'}
      </button>
    </div>
  )
}
