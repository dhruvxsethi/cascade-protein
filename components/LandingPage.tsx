'use client'
import { motion } from 'framer-motion'
import { Dna, Layers, CheckCircle, ArrowRight } from 'lucide-react'

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

const STAGES = [
  {
    name: 'RFDiffusion3',
    icon: Dna,
    stat: '~500 backbones',
    desc: 'Structure generation via diffusion',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/20',
  },
  {
    name: 'ProteinMPNN',
    icon: Layers,
    stat: '~120 sequences',
    desc: 'Inverse folding with GNN',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    ring: 'ring-indigo-500/20',
  },
  {
    name: 'AlphaFold3',
    icon: CheckCircle,
    stat: '~34 validated',
    desc: 'Structure validation & pLDDT scoring',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
  },
]

const FLOW_STEPS = [
  { label: 'RFDiffusion3', sub: 'backbone generation' },
  { label: 'ProteinMPNN', sub: 'sequence design' },
  { label: 'AlphaFold3', sub: 'validation' },
]

export default function LandingPage({ signInButton }: { signInButton?: React.ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] bg-[#050507] text-zinc-100 relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.15), transparent)',
      }}
    >
      {/* Floating glass nav */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-full px-6 py-3 bg-zinc-900/80 backdrop-blur-xl ring-1 ring-white/10 flex items-center gap-4">
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-white font-bold text-xs">C</span>
        </div>
        <span className="text-zinc-100 font-semibold text-sm tracking-tight">Cascade</span>
        <div className="w-px h-4 bg-white/10" />
        <span className="text-zinc-500 text-xs">Protein Design</span>
      </div>

      {/* Main layout: asymmetric split */}
      <div className="flex min-h-[100dvh] items-center px-8 md:px-16 lg:px-24 gap-12 pt-24 pb-16">
        {/* Left column */}
        <motion.div
          className="w-1/2 flex flex-col items-start"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-blue-500/10 ring-1 ring-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-blue-400 text-xs font-medium tracking-wide uppercase">Research Tool</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl font-bold tracking-tighter text-zinc-50 mb-4 leading-[1.05]">
            Cascade
          </h1>
          <p className="text-zinc-400 text-xl mb-3 leading-relaxed">
            Automated protein design pipeline
          </p>
          <p className="text-zinc-600 text-sm mb-12 leading-relaxed max-w-sm">
            Upload a PDB structure and get validated, high-confidence protein designs — powered by RFDiffusion3, ProteinMPNN, and AlphaFold3.
          </p>

          {/* Pipeline flow vertical */}
          <div className="flex flex-col gap-0 mb-12 w-full max-w-xs">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.label} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                    <span className="text-zinc-400 text-xs font-mono">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-zinc-200 text-sm font-semibold">{step.label}</p>
                    <p className="text-zinc-600 text-xs">{step.sub}</p>
                  </div>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="ml-[15px] w-px h-6 bg-zinc-800 my-1" />
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col items-start gap-3">
            {signInButton ?? (
              <button className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white px-8 py-3.5 rounded-full font-semibold text-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-lg shadow-blue-500/20">
                Sign In to Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <p className="text-zinc-700 text-xs">Built for PhD research · Open source</p>
          </div>
        </motion.div>

        {/* Right column: animated pipeline preview cards */}
        <div className="w-1/2 flex flex-col gap-4">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon
            return (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.2 + i * 0.12 }}
              >
                {/* Double-bezel card */}
                <div className="ring-1 ring-white/10 p-1.5 rounded-[2rem] bg-white/5">
                  <div className="rounded-[calc(2rem-6px)] bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${stage.bg} ring-1 ${stage.ring} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${stage.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-100 font-semibold text-sm">{stage.name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{stage.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-mono text-sm font-bold ${stage.color}`}>{stage.stat}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">pass filter</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {/* Subtle connector hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <p className="text-zinc-700 text-xs font-mono">end-to-end · fully automated · GPU-backed</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
