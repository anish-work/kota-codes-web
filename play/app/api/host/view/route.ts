import { isHost } from '@/lib/auth'
import { canUndo, hostRounds, nextStepLabel } from '@/lib/engine'
import { gameFrom, json } from '@/lib/http'
import { joinUrl, wifi } from '@/lib/net'
import type { HostView } from '@/lib/types'

// Everything the host page needs beyond the public state, answers included.
export async function GET(req: Request) {
  if (!(await isHost())) return json({ ok: false }, 401)
  const game = gameFrom(req.url)
  const view: HostView = {
    rounds: hostRounds(game),
    joinUrl: joinUrl(),
    wifi: wifi(),
    canUndo: canUndo(game),
    nextStep: nextStepLabel(game),
  }
  return json(view)
}
