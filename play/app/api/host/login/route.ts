import { headers } from 'next/headers'
import { login, logout } from '@/lib/auth'
import { body, json } from '@/lib/http'

export async function POST(req: Request) {
  const data = await body(req)
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
  const result = await login(String(data.pin ?? ''), ip)
  return json(result, result.ok ? 200 : 401)
}

export async function DELETE() {
  await logout()
  return json({ ok: true })
}
