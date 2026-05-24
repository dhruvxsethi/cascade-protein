import { head } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  try {
    const info = await head(url)
    const res = await fetch(info.downloadUrl)
    const body = await res.arrayBuffer()
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="input.pdb"`,
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
