import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isHost } from '@/lib/auth'
import { BASE } from '@/lib/base'
import { PHOTO_DIR } from '@/lib/db'
import { setPhoto } from '@/lib/engine'
import { json } from '@/lib/http'
import { parseGame } from '@/lib/types'

const MAX_BYTES = 8 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// The host page shrinks each photo before upload. Files get random names,
// so nobody can guess the real one from its address.
export async function POST(req: Request) {
  if (!(await isHost())) return json({ ok: false, error: 'Log in as host first.' }, 401)
  const params = new URL(req.url).searchParams
  const ext = TYPES[req.headers.get('content-type') ?? '']
  if (!ext) return json({ ok: false, error: 'Use a JPEG, PNG or WebP photo.' }, 400)
  const data = Buffer.from(await req.arrayBuffer())
  if (!data.length || data.length > MAX_BYTES) return json({ ok: false, error: 'Photo is too big.' }, 400)
  const name = `${randomBytes(12).toString('hex')}.${ext}`
  await writeFile(path.join(/*turbopackIgnore: true*/ PHOTO_DIR, name), data)
  const error = setPhoto(parseGame(params.get('g')), String(params.get('round')), Number(params.get('slot')), `${BASE}/api/photo/${name}`)
  return json(error ? { ok: false, error } : { ok: true }, error ? 400 : 200)
}
