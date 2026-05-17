import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = { title: 'Cascade — Protein Design Pipeline' }

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const clerkReady = clerkKey.startsWith('pk_') && !clerkKey.includes('placeholder')

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (clerkReady) {
    const { ClerkProvider } = await import('@clerk/nextjs')
    return (
      <ClerkProvider>
        <html lang="en" className="dark">
          <body className={inter.className}>{children}</body>
        </html>
      </ClerkProvider>
    )
  }

  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
