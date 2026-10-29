import { myVote, publicState } from '@/lib/engine'
import { deviceId, gameFrom, json } from '@/lib/http'

// Polled by phones when the live stream drops, and once on page load.
export async function GET(req: Request) {
  const game = gameFrom(req.url)
  const device = deviceId(new URL(req.url).searchParams.get('d'))
  return json({ state: publicState(game), mine: device ? myVote(game, device) : null })
}
