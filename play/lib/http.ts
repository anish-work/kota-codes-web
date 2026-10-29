import { parseGame, type GameId } from './types'

// Phones make their own id: 32 hex characters, nothing personal.
export function deviceId(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value) ? value : null
}

export function gameFrom(url: string): GameId {
  return parseGame(new URL(url).searchParams.get('g'))
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json()
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

export const NO_STORE = { 'Cache-Control': 'no-store' }

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE })
}
