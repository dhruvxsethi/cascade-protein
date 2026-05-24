'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav({ jobId }: { jobId?: string }) {
  const pathname = usePathname()

  return (
    <nav
      style={{ background: 'rgba(8,12,20,0.92)', borderBottom: '1px solid #1A2236' }}
      className="sticky top-0 z-50 backdrop-blur-xl"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="#10B981" strokeWidth="1.5" fill="none"/>
              <circle cx="7" cy="7" r="2" fill="#10B981"/>
            </svg>
          </div>
          <span className="text-slate-100 font-semibold text-sm tracking-tight">Cascade</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            beta
          </span>
        </Link>

        {/* Breadcrumb if on a job page */}
        {jobId && (
          <div className="hidden sm:flex items-center gap-2 text-xs" style={{ color: '#4A5568' }}>
            <Link href="/" className="hover:text-slate-400 transition-colors">Jobs</Link>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ color: '#8A94A8' }} className="font-mono">{jobId.slice(-8)}</span>
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/dauparas/ProteinMPNN"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: '#4A5568' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8A94A8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4A5568')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            Docs
          </a>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            A
          </div>
        </div>
      </div>
    </nav>
  )
}
