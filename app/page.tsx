import UploadForm from '@/components/UploadForm'
import LandingPage from '@/components/LandingPage'

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const clerkReady = clerkKey.startsWith('pk_') && !clerkKey.includes('placeholder')

export default async function Home() {
  if (clerkReady) {
    const { Show, SignInButton } = await import('@clerk/nextjs')
    return (
      <>
        <Show when="signed-out">
          <LandingPage signInButton={
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-[0.97] text-white px-8 py-3.5 rounded-full font-semibold text-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-lg shadow-blue-500/20">
                Sign In to Get Started
              </button>
            </SignInButton>
          } />
        </Show>
        <Show when="signed-in">
          <UploadForm />
        </Show>
      </>
    )
  }

  return <UploadForm />
}
