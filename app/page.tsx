import UploadForm from '@/components/UploadForm'

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const clerkReady = clerkKey.startsWith('pk_') && !clerkKey.includes('placeholder')

function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-lg shadow-blue-500/30">
        C
      </div>

      {/* Wordmark */}
      <h1 className="text-5xl font-bold text-zinc-100 mb-3 tracking-tight">Cascade</h1>
      <p className="text-zinc-400 text-lg mb-2">Automated protein design pipeline</p>
      <p className="text-zinc-600 text-sm mb-10">Upload a PDB → get validated, high-confidence designs</p>

      {/* Pipeline flow */}
      <div className="flex items-center gap-2 mb-10 text-sm">
        {['RFDiffusion3', 'ProteinMPNN', 'AlphaFold3'].map((stage, i, arr) => (
          <span key={stage} className="flex items-center gap-2">
            <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg font-medium">
              {stage}
            </span>
            {i < arr.length - 1 && <span className="text-zinc-600">→</span>}
          </span>
        ))}
      </div>

      {/* CTA - rendered server-side, actual button is passed by Clerk */}
      <div className="mb-6">
        <p className="text-zinc-500 text-sm">Sign in to get started</p>
      </div>

      {/* Fine print */}
      <p className="text-zinc-700 text-xs">Built for PhD research · Open source</p>
    </main>
  )
}

export default async function Home() {
  if (clerkReady) {
    const { Show, SignInButton } = await import('@clerk/nextjs')
    return (
      <>
        <Show when="signed-out">
          <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">
            {/* Logo */}
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-lg shadow-blue-500/30">
              C
            </div>

            {/* Wordmark */}
            <h1 className="text-5xl font-bold text-zinc-100 mb-3 tracking-tight">Cascade</h1>
            <p className="text-zinc-400 text-lg mb-2">Automated protein design pipeline</p>
            <p className="text-zinc-600 text-sm mb-10">Upload a PDB → get validated, high-confidence designs</p>

            {/* Pipeline flow */}
            <div className="flex items-center gap-2 mb-10 text-sm">
              {['RFDiffusion3', 'ProteinMPNN', 'AlphaFold3'].map((stage, i, arr) => (
                <span key={stage} className="flex items-center gap-2">
                  <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg font-medium">
                    {stage}
                  </span>
                  {i < arr.length - 1 && <span className="text-zinc-600">→</span>}
                </span>
              ))}
            </div>

            {/* Sign in button */}
            <SignInButton mode="modal">
              <button className="bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20 mb-8">
                Sign In to Get Started
              </button>
            </SignInButton>

            {/* Fine print */}
            <p className="text-zinc-700 text-xs">Built for PhD research · Open source</p>
          </main>
        </Show>
        <Show when="signed-in">
          <UploadForm />
        </Show>
      </>
    )
  }

  return <UploadForm />
}
