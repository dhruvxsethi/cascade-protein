import { put } from '@vercel/blob'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Try public first, fall back to private (private stores don't support public access)
  let blob
  try {
    blob = await put(file.name, file, {
      access: 'public',
      contentType: 'application/octet-stream',
      addRandomSuffix: true,
    })
    return NextResponse.json({ url: blob.url })
  } catch (pubErr) {
    const msg = pubErr instanceof Error ? pubErr.message : String(pubErr)
    if (!msg.includes('private store')) {
      console.error('Blob put error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // Private store path — upload then get a download URL RunPod can use
  try {
    blob = await put(file.name, file, {
      access: 'private',
      contentType: 'application/octet-stream',
      addRandomSuffix: true,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Blob put error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // For private blobs, serve through our own API so RunPod can download it
  const encoded = encodeURIComponent(blob.url)
  const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/blob-proxy?url=${encoded}`
  return NextResponse.json({ url: downloadUrl })
}
