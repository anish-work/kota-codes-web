import { join } from '@/lib/engine'
import { body, deviceId, json } from '@/lib/http'
import { parseGame } from '@/lib/types'

export async function POST(req: Request) {
  const data = await body(req)
  const device = deviceId(data.d)
  if (!device) return json({ ok: false }, 400)
  join(parseGame(String(data.g)), device)
  return json({ ok: true })
}
