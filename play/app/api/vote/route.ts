import { vote } from '@/lib/engine'
import { body, deviceId, json } from '@/lib/http'
import { parseGame } from '@/lib/types'

export async function POST(req: Request) {
  const data = await body(req)
  const device = deviceId(data.d)
  if (!device || typeof data.round !== 'string' || typeof data.choice !== 'string') return json({ ok: false, reason: 'invalid' }, 400)
  const result = vote(parseGame(String(data.g)), device, data.round, data.choice)
  return json(result, result.ok ? 200 : 409)
}
