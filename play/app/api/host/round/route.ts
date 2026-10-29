import { isHost } from '@/lib/auth'
import { editRound, type RoundEdit } from '@/lib/engine'
import { body, json } from '@/lib/http'
import { parseGame } from '@/lib/types'

export async function PATCH(req: Request) {
  if (!(await isHost())) return json({ ok: false, error: 'Log in as host first.' }, 401)
  const data = await body(req)
  const e = (data.edit ?? {}) as Record<string, unknown>
  const edit: RoundEdit = {}
  if (typeof e.label === 'string') edit.label = e.label
  if (typeof e.prompt === 'string') edit.prompt = e.prompt
  if (typeof e.answer === 'string' || e.answer === null) edit.answer = e.answer as string | null
  if (typeof e.note === 'string' || e.note === null) edit.note = e.note as string | null
  if (typeof e.skipped === 'boolean') edit.skipped = e.skipped
  if (typeof e.points === 'number') edit.points = e.points
  const error = editRound(parseGame(String(data.g)), String(data.round), edit)
  return json(error ? { ok: false, error } : { ok: true }, error ? 400 : 200)
}
