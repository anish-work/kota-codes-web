import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { BASE } from './base'

// The host logs in once with HOST_PIN; the browser then keeps a cookie that
// only this server can make. Changing HOST_PIN logs everyone out.
const COOKIE = 'kota_host'
const MAX_FAILS = 5
const LOCK_MS = 60_000

const store = globalThis as unknown as { __kotaFails?: Map<string, { fails: number; until: number }> }
const fails = (store.__kotaFails ??= new Map())

function pin(): string | null {
  const value = process.env.HOST_PIN?.trim()
  return value ? value : null
}

function token(p: string): string {
  return createHmac('sha256', p).update('kota-vs-ai host').digest('hex')
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export async function isHost(): Promise<boolean> {
  const p = pin()
  const value = (await cookies()).get(COOKIE)?.value
  return !!p && !!value && same(value, token(p))
}

export type LoginResult = { ok: true } | { ok: false; error: string }

export async function login(attempt: string, ip: string): Promise<LoginResult> {
  const p = pin()
  if (!p) return { ok: false, error: 'No PIN set. Add HOST_PIN to .env.local and restart.' }
  const entry = fails.get(ip)
  if (entry && entry.until > Date.now()) return { ok: false, error: 'Too many tries. Wait a minute.' }
  if (!same(token(attempt.trim()), token(p))) {
    const count = (entry?.fails ?? 0) + 1
    fails.set(ip, { fails: count >= MAX_FAILS ? 0 : count, until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 })
    return { ok: false, error: 'Wrong PIN.' }
  }
  fails.delete(ip)
  ;(await cookies()).set(COOKIE, token(p), {
    httpOnly: true,
    sameSite: 'strict',
    path: BASE,
    maxAge: 60 * 60 * 24 * 7,
  })
  return { ok: true }
}

export async function logout() {
  ;(await cookies()).set(COOKIE, '', { httpOnly: true, sameSite: 'strict', path: BASE, maxAge: 0 })
}
