import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PHOTO_DIR } from '@/lib/db'

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  if (!/^[0-9a-f]{24}\.(jpg|png|webp)$/.test(name)) return new Response('Not found', { status: 404 })
  try {
    const file = await readFile(path.join(/*turbopackIgnore: true*/ PHOTO_DIR, name))
    const type = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    return new Response(file, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
