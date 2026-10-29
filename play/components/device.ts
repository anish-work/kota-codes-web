'use client'

// An anonymous id for this phone, kept in localStorage. Built from
// getRandomValues because crypto.randomUUID needs https, and the game runs on http.
const KEY = 'kota-device'

export function getDeviceId(): string {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && /^[0-9a-f]{32}$/.test(saved)) return saved
  } catch {}
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  try {
    localStorage.setItem(KEY, id)
  } catch {}
  return id
}
