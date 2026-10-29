import { isHost } from '@/lib/auth'
import { act, publicState, type HostAction } from '@/lib/engine'
import { body, json } from '@/lib/http'
import { parseGame } from '@/lib/types'

const ACTIONS: HostAction[] = ['next', 'openJoin', 'nextRound', 'closeVoting', 'showResults', 'showAnswer', 'showFinal', 'pause', 'undo', 'reset', 'reload']

export async function POST(req: Request) {
  if (!(await isHost())) return json({ ok: false, error: 'Log in as host first.' }, 401)
  const data = await body(req)
  const game = parseGame(String(data.g))
  const action = data.action as HostAction
  if (!ACTIONS.includes(action)) return json({ ok: false, error: 'Unknown action.' }, 400)
  act(game, action)
  return json({ ok: true, state: publicState(game) })
}
