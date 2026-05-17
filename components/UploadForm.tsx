'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle, ChevronDown, ChevronRight, Dna, Layers, Zap } from 'lucide-react'

const DESIGN_OPTIONS = [3, 10, 100, 500]

type LoadingStep = 'uploading' | 'creating' | 'starting' | null

const LOADING_STEPS: { key: NonNullable<LoadingStep>; label: string }[] = [
  { key: 'uploading', label: 'Uploading PDB...' },
  { key: 'creating', label: 'Creating job...' },
  { key: 'starting', label: 'Starting GPU pod...' },
]

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

function NavBar() {
  return (
    <nav className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
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

const INFO_STAGES = [
  {
    icon: Dna,
    name: 'RFDiffusion3',
    filter: '~500 backbones generated',
    desc: 'Diffuses backbone coordinates conditioned on your input structure using a trained denoising model.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/20',
  },
  {
    icon: Layers,
    name: 'ProteinMPNN',
    filter: '~120 sequences pass',
    desc: 'Graph neural network assigns amino acid sequences to each backbone that are likely to fold correctly.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    ring: 'ring-indigo-500/20',
  },
  {
    icon: Zap,
    name: 'AlphaFold3',
    filter: '~34 designs validated',
    desc: 'Predicts folded structure for each sequence. Designs with pLDDT > 70 are flagged as validated.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
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
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      let res: Response
      try {
        res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdbBlobUrl: blob.url,
            pdbFileName: file.name,
            designCount,
            ...params,
          }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }

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

  const currentStepIdx = loadingStep
    ? LOADING_STEPS.findIndex(s => s.key === loadingStep)
    : -1

  // Drop zone appearance
  const dropZoneInner = dragOver
    ? 'border-blue-500 bg-blue-500/5'
    : file
    ? 'border-emerald-500/50 bg-emerald-500/5'
    : 'border-zinc-700 hover:border-zinc-600'

  return (
    <div className="min-h-[100dvh] bg-[#050507] text-zinc-100">
      <NavBar />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Page header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">New Pipeline Run</h1>
          <p className="text-zinc-500">Upload a PDB structure file to generate designed protein variants.</p>
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: form controls */}
          <motion.div
            className="md:w-7/12 flex flex-col gap-6"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
          >
            {/* Drop zone: double-bezel */}
            <div className="ring-1 ring-white/10 p-1.5 rounded-[2rem] bg-white/[0.02]">
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('pdb-input')?.click()}
                role="button"
                aria-label="Upload PDB file"
                className={`rounded-[calc(2rem-6px)] border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${dropZoneInner}`}
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
                    <motion.div
                      key="file"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={SPRING}
                      className="space-y-2"
                    >
                      <div className="flex justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                      </div>
                      <p className="text-emerald-400 font-semibold text-lg">{file.name}</p>
                      <p className="text-zinc-500 text-sm">{(file.size / 1024).toFixed(1)} KB · click to replace</p>
                    </motion.div>
                  ) : dragOver ? (
                    <motion.div
                      key="drag"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={SPRING}
                      className="space-y-2"
                    >
                      <div className="flex justify-center">
                        <Upload className="w-10 h-10 text-blue-400" />
                      </div>
                      <p className="text-blue-400 font-semibold">Drop it here</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={SPRING}
                      className="space-y-3"
                    >
                      <div className="flex justify-center">
                        <Upload className="w-10 h-10 text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-zinc-300 font-medium">Drop your .pdb file here</p>
                        <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
                      </div>
                      <p className="text-zinc-700 text-xs">Supports PDB format · any size</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Design count */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">Number of designs</label>
              <div className="grid grid-cols-4 gap-2">
                {DESIGN_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDesignCount(n)}
                    className={`py-2.5 rounded-full text-sm font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
                      designCount === n
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-zinc-800/50 ring-1 ring-white/10 text-zinc-400 hover:text-zinc-200 hover:ring-white/20'
                    }`}
                  >
                    {n.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced params toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
              >
                {showAdvanced
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
                }
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
                    <div className="grid grid-cols-2 gap-3 mt-3 p-5 bg-zinc-900/60 rounded-2xl ring-1 ring-white/8">
                      {(Object.entries(params) as [keyof typeof params, number][]).map(([key, val]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={val}
                            onChange={e =>
                              setParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))
                            }
                            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Loading state (Framer Motion AnimatePresence) */}
            <AnimatePresence>
              {loadingStep && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING}
                  className="overflow-hidden"
                >
                  <div className="ring-1 ring-white/10 p-1.5 rounded-2xl bg-white/[0.02]">
                    <div className="rounded-[calc(1rem-6px)] bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-4 space-y-3">
                      {LOADING_STEPS.map((step, i) => {
                        const isDone = i < currentStepIdx
                        const isActive = i === currentStepIdx
                        const isPending = i > currentStepIdx
                        return (
                          <div key={step.key} className={`flex items-center gap-3 transition-opacity ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                              {isDone ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              ) : isActive ? (
                                <div className="w-4 h-4 rounded-full shimmer" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                              )}
                            </div>
                            <div className="flex-1">
                              {isActive ? (
                                <div className="space-y-1.5">
                                  <p className="text-zinc-300 text-sm">{step.label}</p>
                                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="shimmer h-full w-full rounded-full" />
                                  </div>
                                </div>
                              ) : (
                                <p className={`text-sm ${isDone ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>
                                  {step.label}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLoadingStep(null); setError('') }}
                    className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors w-full text-center"
                  >
                    Something stuck? Start over
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SPRING}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !file}
              className={`w-full py-3.5 rounded-full font-semibold text-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] flex items-center justify-center gap-2 ${
                !file
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed ring-1 ring-white/5'
                  : loading
                  ? 'bg-blue-600/40 text-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full shimmer shrink-0" />
                  Starting...
                </>
              ) : (
                <>
                  Run Pipeline
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>

          {/* Right: info panel */}
          <motion.div
            className="md:w-5/12 flex flex-col gap-4"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.15 }}
          >
            {/* Stage info cards */}
            {INFO_STAGES.map((stage, i) => {
              const Icon = stage.icon
              return (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.2 + i * 0.08 }}
                >
                  <div className="ring-1 ring-white/10 p-1.5 rounded-[2rem] bg-white/[0.02]">
                    <div className="rounded-[calc(2rem-6px)] bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-5">
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg ${stage.bg} ring-1 ${stage.ring} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${stage.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-zinc-100 font-semibold text-sm">{stage.name}</p>
                            <span className={`font-mono text-xs ${stage.color}`}>{stage.filter}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-zinc-500 text-xs leading-relaxed pl-11">{stage.desc}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Cost estimate */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.44 }}
              className="ring-1 ring-white/10 p-1.5 rounded-[2rem] bg-white/[0.02]"
            >
              <div className="rounded-[calc(2rem-6px)] bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-5">
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium mb-4">Estimate for {designCount.toLocaleString()} designs</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Est. time', value: `~${estimatedHours}h`, sub: 'wall clock' },
                    { label: 'GPU cost', value: `~$${estimatedCost}`, sub: 'RunPod H100' },
                    { label: 'Stages', value: '3', sub: 'RFD3 + MPNN + AF3' },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <p className="text-zinc-100 font-bold font-mono text-lg tabular-nums">{item.value}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{item.label}</p>
                      <p className="text-zinc-700 text-xs">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
