import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata = { title: 'Cascade — Protein Design Pipeline' }

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const clerkReady = clerkKey.startsWith('pk_') && !clerkKey.includes('placeholder')

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const html = (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased" style={{ background: '#080C14', color: '#E2E8F0' }}>{children}</body>
    </html>
  )
  if (clerkReady) {
    const { ClerkProvider } = await import('@clerk/nextjs')
    return <ClerkProvider>{html}</ClerkProvider>
  }
  return html
}
