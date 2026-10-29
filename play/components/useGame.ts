'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BASE } from '@/lib/base'
import type { GameId, PublicState } from '@/lib/types'

const STALE_MS = 15_000
const POLL_MS = 3_000

// Live game state: a Server-Sent Events stream, with quiet polling whenever the
// stream goes silent (phone locked, wifi blip). Also keeps the server clock offset
// so every countdown shows the same number.
export function useGame(game: GameId, device?: string | null) {
  const [state, setState] = useState<PublicState | null>(null)
  const [online, setOnline] = useState(true)
  const [mine, setMine] = useState<{ roundId: string; choice: string } | null>(null)
  const offset = useRef(0)
  const lastSeen = useRef(0)
  const version = useRef(-1)

  const accept = useCallback((next: PublicState) => {
    lastSeen.current = Date.now()
    setOnline(true)
    // Stream and polls can cross; never step back to an older state.
    if (next.version < version.current) return
    version.current = next.version
    offset.current = next.serverNow - Date.now()
    setState(next)
  }, [])

  const poll = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ g: game })
      if (device) qs.set('d', device)
      const res = await fetch(`${BASE}/api/state?${qs}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { state: PublicState; mine: { roundId: string; choice: string } | null }
      accept(data.state)
      if (device) setMine(data.mine)
    } catch {
      if (Date.now() - lastSeen.current > STALE_MS) setOnline(false)
    }
  }, [game, device, accept])

  useEffect(() => {
    let source: EventSource | null = null
    let closed = false

    const open = () => {
      source?.close()
      source = new EventSource(`${BASE}/api/stream?g=${game}`)
      source.onmessage = (e) => {
        try {
          accept(JSON.parse(e.data))
        } catch {}
      }
      source.addEventListener('ping', () => {
        lastSeen.current = Date.now()
        setOnline(true)
      })
    }

    const wake = () => {
      if (closed) return
      if (Date.now() - lastSeen.current > STALE_MS || source?.readyState === EventSource.CLOSED) open()
      void poll()
    }

    open()
    void poll()
    const timer = setInterval(() => {
      // The stream pings every 5s; silence longer than that means it has dropped.
      if (Date.now() - lastSeen.current > 8_000) void poll()
      if (Date.now() - lastSeen.current > STALE_MS) open()
    }, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && wake()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', wake)
    window.addEventListener('pageshow', wake)

    return () => {
      closed = true
      clearInterval(timer)
      source?.close()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', wake)
      window.removeEventListener('pageshow', wake)
    }
  }, [game, accept, poll])

  const serverNow = useCallback(() => Date.now() + offset.current, [])

  return { state, online, mine, setMine, serverNow, refresh: poll, setState: accept }
}

// Seconds left on the voting timer, updated a few times a second.
export function useSecondsLeft(endsAt: number | null, serverNow: () => number): number | null {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!endsAt) {
      setLeft(null)
      return
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - serverNow()) / 1000)))
    tick()
    const t = setInterval(tick, 200)
    return () => clearInterval(t)
  }, [endsAt, serverNow])
  return left
}
