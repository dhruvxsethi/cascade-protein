'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle, ChevronDown, ChevronRight, Dna, Layers, Zap, Info } from 'lucide-react'
import Nav from './Nav'

const DESIGN_OPTIONS = [3, 10, 100, 500]
type LoadingStep = 'uploading' | 'creating' | 'starting' | null

const LOADING_STEPS: { key: NonNullable<LoadingStep>; label: string }[] = [
  { key: 'uploading', label: 'Uploading PDB file...' },
  { key: 'creating',  label: 'Creating job record...' },
  { key: 'starting',  label: 'Starting GPU pod...' },
]

const EASE = [0.32, 0.72, 0, 1] as const
const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

const PIPELINE_STAGES = [
  {
    icon: Dna,
    name: 'RFDiffusion3',
    tag: 'Backbone generation',
    desc: 'Denoising diffusion model generates novel backbone coordinates conditioned on your input structure.',
    accent: '#3B82F6',
    accentDim: 'rgba(59,130,246,0.12)',
    accentBorder: 'rgba(59,130,246,0.25)',
    stat: '~80% pass filter',
  },
  {
    icon: Layers,
    name: 'ProteinMPNN',
    tag: 'Sequence design',
    desc: 'Graph neural network designs amino acid sequences that fold into each generated backbone.',
    accent: '#818CF8',
    accentDim: 'rgba(129,140,248,0.12)',
    accentBorder: 'rgba(129,140,248,0.25)',
    stat: '8 sequences / backbone',
  },
  {
    icon: Zap,
    name: 'Boltz-2',
    tag: 'Structure validation',
    desc: 'Open-source AlphaFold3-level model independently validates each sequence. Designs with pLDDT > 70 are exported.',
    accent: '#10B981',
    accentDim: 'rgba(16,185,129,0.12)',
    accentBorder: 'rgba(16,185,129,0.25)',
    stat: '~30% validated',
  },
]

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
  const [showStuckButton, setShowStuckButton] = useState(false)

  const loading = loadingStep !== null

  useEffect(() => {
    if (!loading) { setShowStuckButton(false); return }
    const t = setTimeout(() => setShowStuckButton(true), 12_000)
    return () => clearTimeout(t)
  }, [loading])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.pdb')) { setFile(f); setError('') }
    else setError('Please upload a .pdb file')
  }, [])

  const handleSubmit = async () => {
    if (!file) return setError('Please select a PDB file')
    setError('')
    try {
      setLoadingStep('uploading')
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? 'Upload failed')
      const { url: pdbBlobUrl } = uploadJson

      setLoadingStep('creating')
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdbBlobUrl, pdbFileName: file.name, designCount, ...params }),
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

  const estMins = Math.max(5, designCount * 0.5)
  const estHours = estMins >= 60 ? `~${(estMins / 60).toFixed(1)}h` : `~${Math.round(estMins)}m`
  const estCost = (designCount * 0.0055).toFixed(2)

  const currentStepIdx = loadingStep ? LOADING_STEPS.findIndex(s => s.key === loadingStep) : -1

  return (
    <div className="min-h-[100dvh]" style={{ background: '#080C14', color: '#E2E8F0' }}>
      <Nav />

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Page header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              New Run
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1.5" style={{ color: '#E2E8F0' }}>
            Run Protein Design Pipeline
          </h1>
          <p className="text-sm" style={{ color: '#8A94A8' }}>
            Upload a PDB structure to generate and validate novel protein designs via RFDiffusion3 → ProteinMPNN → Boltz-2.
          </p>
        </motion.div>

        {/* Two column layout */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT: Controls */}
          <motion.div
            className="lg:w-[55%] flex flex-col gap-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.08 }}
          >
            {/* Upload zone */}
            <div style={{ background: '#0D1220', border: '1px solid #1A2236', borderRadius: 12 }}>
              <div className="p-1">
                <div
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => document.getElementById('pdb-input')?.click()}
                  role="button"
                  aria-label="Upload PDB file"
                  className="cursor-pointer transition-all duration-200 rounded-[10px] p-10 text-center"
                  style={{
                    border: `2px dashed ${dragOver ? '#3B82F6' : file ? '#10B981' : '#1A2236'}`,
                    background: dragOver ? 'rgba(59,130,246,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'transparent',
                  }}
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
                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div key="file" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={SPRING} className="space-y-2">
                        <div className="flex justify-center">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                          </div>
                        </div>
                        <p className="font-semibold" style={{ color: '#10B981' }}>{file.name}</p>
                        <p className="text-xs" style={{ color: '#4A5568' }}>{(file.size / 1024).toFixed(1)} KB · click to replace</p>
                      </motion.div>
                    ) : dragOver ? (
                      <motion.div key="drag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                        <div className="flex justify-center">
                          <Upload className="w-8 h-8" style={{ color: '#3B82F6' }} />
                        </div>
                        <p className="font-medium text-sm" style={{ color: '#3B82F6' }}>Drop it here</p>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        <div className="flex justify-center">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#131928', border: '1px solid #1A2236' }}>
                            <Upload className="w-5 h-5" style={{ color: '#4A5568' }} />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-1" style={{ color: '#E2E8F0' }}>Drop your .pdb file here</p>
                          <p className="text-xs" style={{ color: '#4A5568' }}>or click to browse · any size</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Design count */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#4A5568' }}>
                Number of designs
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DESIGN_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDesignCount(n)}
                    className="py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
                    style={designCount === n
                      ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
                      : { background: '#0D1220', color: '#8A94A8', border: '1px solid #1A2236' }
                    }
                    onMouseEnter={e => {
                      if (designCount !== n) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.borderColor = '#242D45'
                        el.style.color = '#E2E8F0'
                      }
                    }}
                    onMouseLeave={e => {
                      if (designCount !== n) {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.borderColor = '#1A2236'
                        el.style.color = '#8A94A8'
                      }
                    }}
                  >
                    {n.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced params */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: '#4A5568' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#8A94A8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4A5568')}
              >
                {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Advanced parameters
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SPRING}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3 mt-3 p-4 rounded-xl" style={{ background: '#131928', border: '1px solid #1A2236' }}>
                      {(Object.entries(params) as [keyof typeof params, number][]).map(([key, val]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#4A5568' }}>
                            {key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={val}
                            onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none transition-all"
                            style={{ background: '#0D1220', border: '1px solid #1A2236', color: '#E2E8F0' }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#10B981')}
                            onBlur={e => (e.currentTarget.style.borderColor = '#1A2236')}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Loading indicator */}
            <AnimatePresence>
              {loadingStep && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl space-y-3" style={{ background: '#0D1220', border: '1px solid #1A2236' }}>
                    {LOADING_STEPS.map((step, i) => {
                      const isDone = i < currentStepIdx
                      const isActive = i === currentStepIdx
                      const isPending = i > currentStepIdx
                      return (
                        <div key={step.key} className={`flex items-center gap-3 transition-opacity ${isPending ? 'opacity-30' : ''}`}>
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {isDone ? (
                              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                            ) : isActive ? (
                              <div className="w-4 h-4 rounded-full shimmer" />
                            ) : (
                              <div className="w-2 h-2 rounded-full" style={{ background: '#1A2236' }} />
                            )}
                          </div>
                          <div className="flex-1">
                            {isActive ? (
                              <div className="space-y-1.5">
                                <p className="text-sm" style={{ color: '#E2E8F0' }}>{step.label}</p>
                                <div className="h-0.5 rounded-full overflow-hidden" style={{ background: '#1A2236' }}>
                                  <div className="shimmer h-full w-full rounded-full" />
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm" style={{ color: isDone ? '#4A5568' : '#4A5568', textDecoration: isDone ? 'line-through' : 'none' }}>
                                {step.label}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <AnimatePresence>
                    {showStuckButton && (
                      <motion.button
                        type="button"
                        onClick={() => { setLoadingStep(null); setError('') }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 text-xs w-full text-center transition-colors"
                        style={{ color: '#4A5568' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#8A94A8')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#4A5568')}
                      >
                        Something stuck? Start over
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING}
                  className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !file}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              style={
                !file
                  ? { background: '#0D1220', color: '#4A5568', border: '1px solid #1A2236', cursor: 'not-allowed' }
                  : loading
                  ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', cursor: 'not-allowed' }
                  : { background: '#10B981', color: 'white', border: '1px solid #10B981', cursor: 'pointer' }
              }
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full shimmer shrink-0" />
                  Starting...
                </>
              ) : (
                <>
                  Run Pipeline
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </motion.div>

          {/* RIGHT: Info panel */}
          <motion.div
            className="lg:w-[45%] flex flex-col gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.15 }}
          >
            {/* Pipeline stages */}
            {PIPELINE_STAGES.map((stage, i) => {
              const Icon = stage.icon
              return (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.2 + i * 0.07 }}
                  className="rounded-xl p-4"
                  style={{ background: '#0D1220', border: '1px solid #1A2236' }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: stage.accentDim, border: `1px solid ${stage.accentBorder}` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: stage.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>{stage.name}</p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: stage.accentDim, color: stage.accent }}
                          >
                            {stage.tag}
                          </span>
                        </div>
                        <span className="text-xs font-mono shrink-0" style={{ color: stage.accent }}>{stage.stat}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: '#4A5568' }}>{stage.desc}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Cost / estimate card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.42 }}
              className="rounded-xl p-4"
              style={{ background: '#0D1220', border: '1px solid #1A2236' }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Info className="w-3.5 h-3.5" style={{ color: '#4A5568' }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A5568' }}>
                  Estimate for {designCount.toLocaleString()} designs
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Run time', value: estHours, sub: 'wall clock' },
                  { label: 'GPU cost', value: `~$${estCost}`, sub: 'RunPod RTX' },
                  { label: 'Pipeline', value: '3', sub: 'RFD3 · MPNN · Boltz-2' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: '#131928', border: '1px solid #1A2236' }}>
                    <p className="text-base font-bold font-mono tabular-nums mb-0.5" style={{ color: '#E2E8F0' }}>{item.value}</p>
                    <p className="text-xs mb-0.5" style={{ color: '#8A94A8' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: '#4A5568' }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
