'use client'
import { motion } from 'framer-motion'
import { Dna, Layers, Zap } from 'lucide-react'

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 20 }

const STAGES = [
  {
    icon: Dna,
    name: 'RFDiffusion3',
    stat: '~80% pass',
    desc: 'Generates novel backbone scaffolds via denoising diffusion',
    color: '#3B82F6',
    dim:   'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.25)',
  },
  {
    icon: Layers,
    name: 'ProteinMPNN',
    stat: '8× per backbone',
    desc: 'Graph neural network inverse-folds sequences onto each backbone',
    color: '#818CF8',
    dim:   'rgba(129,140,248,0.12)',
    border: 'rgba(129,140,248,0.25)',
  },
  {
    icon: Zap,
    name: 'Boltz-2',
    stat: '~30% validated',
    desc: 'Open-source AlphaFold3-level validation with pLDDT scoring',
    color: '#10B981',
    dim:   'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
  },
]

export default function LandingPage({ signInButton }: { signInButton?: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] relative overflow-hidden" style={{ background: '#080C14', color: '#E2E8F0' }}>
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(16,185,129,0.08), transparent), radial-gradient(ellipse 40% 30% at 80% 60%, rgba(59,130,246,0.06), transparent)',
        }}
      />

      {/* Nav */}
      <nav
        className="relative z-10"
        style={{ borderBottom: '1px solid #1A2236', background: 'rgba(8,12,20,0.8)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="#10B981" strokeWidth="1.5" fill="none"/>
                <circle cx="7" cy="7" r="2" fill="#10B981"/>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight" style={{ color: '#E2E8F0' }}>Cascade</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              beta
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: '#4A5568' }}>
            <span>Powered by RFDiffusion · ProteinMPNN · Boltz-2</span>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-start gap-16">

        {/* Left */}
        <motion.div
          className="lg:w-1/2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6 text-xs font-medium"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#10B981' }} />
            Research Tool · PhD Lab
          </div>

          <h1 className="text-5xl font-bold tracking-tight mb-4" style={{ color: '#E2E8F0', lineHeight: 1.1 }}>
            Automated<br />
            <span style={{ color: '#10B981' }}>protein design</span><br />
            pipeline
          </h1>
          <p className="text-base leading-relaxed mb-4" style={{ color: '#8A94A8', maxWidth: 420 }}>
            Upload any PDB structure. Get hundreds of computationally validated protein variants ranked by confidence — ready to synthesize and test.
          </p>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#4A5568', maxWidth: 400 }}>
            Currently configured for <span style={{ color: '#8A94A8' }}>mxe_gyra (GyrA intein, PDB 4OZ6)</span> — preserving 14 catalytic residues while exploring new backbone space.
          </p>

          {/* Pipeline steps */}
          <div className="flex flex-col gap-0 mb-10">
            {STAGES.map((stage, i) => (
              <div key={stage.name}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: stage.dim, border: `1px solid ${stage.border}` }}
                  >
                    <stage.icon className="w-4 h-4" style={{ color: stage.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>{stage.name}</p>
                    <p className="text-xs" style={{ color: '#4A5568' }}>{stage.desc}</p>
                  </div>
                  <span className="ml-auto text-xs font-mono" style={{ color: stage.color }}>{stage.stat}</span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className="ml-4 w-px h-5 my-1" style={{ background: '#1A2236' }} />
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col items-start gap-3">
            {signInButton ?? (
              <button
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98]"
                style={{ background: '#10B981' }}
              >
                Sign in to get started
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <p className="text-xs" style={{ color: '#4A5568' }}>Built for PhD research · Open source models</p>
          </div>
        </motion.div>

        {/* Right: stage cards */}
        <div className="lg:w-1/2 flex flex-col gap-3">
          {STAGES.map((stage, i) => (
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING, delay: 0.2 + i * 0.1 }}
              className="rounded-xl p-5"
              style={{ background: '#0D1220', border: '1px solid #1A2236' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: stage.dim, border: `1px solid ${stage.border}` }}
                >
                  <stage.icon className="w-5 h-5" style={{ color: stage.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-0.5" style={{ color: '#E2E8F0' }}>{stage.name}</p>
                  <p className="text-xs" style={{ color: '#4A5568' }}>{stage.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono" style={{ color: stage.color }}>{stage.stat}</p>
                  <p className="text-xs" style={{ color: '#4A5568' }}>pass filter</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.55 }}
            className="grid grid-cols-3 gap-3 mt-1"
          >
            {[
              { label: 'Avg GPU cost', value: '~$0.55', sub: 'per 100 designs' },
              { label: 'Run time',     value: '~45m',   sub: 'wall clock'       },
              { label: 'Model',        value: 'Boltz-2', sub: 'for validation'  },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#0D1220', border: '1px solid #1A2236' }}>
                <p className="text-sm font-bold font-mono tabular-nums mb-0.5" style={{ color: '#E2E8F0' }}>{item.value}</p>
                <p className="text-xs mb-0.5" style={{ color: '#8A94A8' }}>{item.label}</p>
                <p className="text-xs" style={{ color: '#4A5568' }}>{item.sub}</p>
              </div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs font-mono"
            style={{ color: '#4A5568' }}
          >
            end-to-end · fully automated · GPU-backed · open source models
          </motion.p>
        </div>
      </div>
    </div>
  )
}
