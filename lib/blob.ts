import { put, list } from '@vercel/blob'

export async function uploadFile(
  filename: string,
  data: Buffer | Blob,
  contentType: string
): Promise<string> {
  const { url } = await put(filename, data, {
    access: 'public',
    contentType,
  })
  return url
}

export async function uploadText(filename: string, text: string): Promise<string> {
  return uploadFile(filename, Buffer.from(text), 'text/plain')
}

export async function listFiles(prefix: string) {
  return list({ prefix })
}
