import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ['chemical/x-pdb', 'text/plain', 'application/octet-stream'],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url)
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
