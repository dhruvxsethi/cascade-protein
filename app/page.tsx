import UploadForm from '@/components/UploadForm'

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const clerkReady = clerkKey.startsWith('pk_') && !clerkKey.includes('placeholder')

export default async function Home() {
  if (clerkReady) {
    const { Show, SignInButton } = await import('@clerk/nextjs')
    return (
      <main className="min-h-screen bg-white">
        <Show when="signed-out">
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-4xl font-bold">Cascade</h1>
            <p className="text-gray-500">Automated protein design — RFDiffusion → ProteinMPNN → AlphaFold3</p>
            <SignInButton mode="modal">
              <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700">
                Sign In
              </button>
            </SignInButton>
          </div>
        </Show>
        <Show when="signed-in">
          <UploadForm />
        </Show>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <UploadForm />
    </main>
  )
}
