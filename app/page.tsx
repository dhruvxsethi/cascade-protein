import { Show, SignInButton } from '@clerk/nextjs'
import UploadForm from '@/components/UploadForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-4xl font-bold">Protein Design Pipeline</h1>
          <p className="text-gray-500">Sign in to start designing proteins</p>
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
