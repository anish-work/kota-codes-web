import { networkInterfaces } from 'node:os'
import { BASE } from './base'

// The address phones open. PUBLIC_URL wins; otherwise use this laptop's
// address on the local network (the router usually hands out 192.168.x.x).
export function joinUrl(): string {
  const fixed = process.env.PUBLIC_URL?.trim()
  if (fixed) return fixed.replace(/\/$/, '')
  const port = process.env.PORT || '3000'
  const host = lanAddress() ?? 'localhost'
  return `http://${host}${port === '80' ? '' : `:${port}`}${BASE}`
}

function lanAddress(): string | null {
  const found: string[] = []
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal) found.push(a.address)
    }
  }
  const rank = (ip: string) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3)
  found.sort((a, b) => rank(a) - rank(b))
  return found[0] ?? null
}

export function wifi(): { ssid: string; password: string } | null {
  const ssid = process.env.WIFI_SSID?.trim()
  return ssid ? { ssid, password: process.env.WIFI_PASSWORD ?? '' } : null
}

// The standard format phone cameras read to join a network.
export function wifiQrText(w: { ssid: string; password: string }): string {
  const esc = (s: string) => s.replace(/([\;,:"])/g, '\\$1')
  return w.password ? `WIFI:T:WPA;S:${esc(w.ssid)};P:${esc(w.password)};;` : `WIFI:T:nopass;S:${esc(w.ssid)};;`
}
