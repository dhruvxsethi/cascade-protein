'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'

const DESIGN_OPTIONS = [100, 500, 1000, 5000]

type LoadingStep = 'uploading' | 'creating' | 'starting' | null

const LOADING_MESSAGES: Record<NonNullable<LoadingStep>, string> = {
  uploading: 'Uploading PDB to cloud storage...',
  creating: 'Creating pipeline job...',
  starting: 'Spinning up GPU on RunPod...',
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

export default function UploadForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [designCount, setDesignCount] = useState(100)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [params, setParams] = useState({
    cfg_scale: 2.0,
    step_scale: 1.5,
    num_timesteps: 200,
    sampling_temp: 0.1,
  })
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null)
  const [error, setError] = useState('')

  const loading = loadingStep !== null

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
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
    setError('')

    try {
      setLoadingStep('uploading')
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

      setLoadingStep('creating')
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

      setLoadingStep('starting')
      await new Promise(r => setTimeout(r, 600))
      router.push(`/dashboard/${data.jobId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLoadingStep(null)
    }
  }

  const estimatedHours = Math.max(1, Math.ceil(designCount / 60))
  const estimatedCost = (estimatedHours * 0.74).toFixed(2)

  const dropZoneBorder = dragOver
    ? 'border-blue-500 bg-blue-500/5'
    : file
    ? 'border-emerald-500 bg-emerald-500/5'
    : 'border-zinc-700 hover:border-zinc-600'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">New Pipeline Run</h1>
          <p className="text-zinc-400">Upload a PDB structure file to generate designed protein variants.</p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('pdb-input')?.click()}
          role="button"
          aria-label="Upload PDB file"
          className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200 mb-6 ${dropZoneBorder}`}
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
            <div className="space-y-2">
              <div className="text-3xl">✓</div>
              <p className="text-emerald-400 font-semibold text-lg">{file.name}</p>
              <p className="text-zinc-500 text-sm">{(file.size / 1024).toFixed(1)} KB · click to replace</p>
            </div>
          ) : dragOver ? (
            <div className="space-y-2">
              <div className="text-3xl text-blue-400">↓</div>
              <p className="text-blue-400 font-semibold">Drop it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl text-zinc-600">↑</div>
              <div>
                <p className="text-zinc-300 font-medium">Drop your .pdb file here</p>
                <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
              </div>
              <p className="text-zinc-600 text-xs">Supports PDB format · any size</p>
            </div>
          )}
        </div>

        {/* Design count */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-3">Number of designs</label>
          <div className="grid grid-cols-4 gap-2">
            {DESIGN_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setDesignCount(n)}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  designCount === n
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced params toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-3 flex items-center gap-1"
        >
          <span className="text-xs">{showAdvanced ? '▼' : '›'}</span>
          Advanced parameters
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 mb-6 p-5 bg-zinc-900 rounded-xl border border-zinc-800">
            {(Object.entries(params) as [keyof typeof params, number][]).map(([key, val]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">{key.replace(/_/g, ' ')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={val}
                  onChange={e =>
                    setParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            ))}
          </div>
        )}

        {/* Estimate bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Est. time', value: `~${estimatedHours}h`, sub: 'wall clock' },
            { label: 'GPU cost', value: `~$${estimatedCost}`, sub: 'RunPod H100' },
            { label: 'Pipeline stages', value: '3', sub: 'RFD3 → MPNN → AF3' },
          ].map(item => (
            <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-zinc-500 text-xs mb-1">{item.label}</p>
              <p className="text-zinc-100 font-semibold text-lg">{item.value}</p>
              <p className="text-zinc-600 text-xs mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Loading state indicator */}
        {loadingStep && (
          <div className="mb-4 flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-blue-300 text-sm">{LOADING_MESSAGES[loadingStep]}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !file}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
            !file
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : loading
              ? 'bg-blue-600/60 text-blue-200 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/20'
          }`}
        >
          {loading ? 'Starting...' : 'Run Pipeline →'}
        </button>
      </div>
    </div>
  )
}
