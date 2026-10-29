import Screen from '@/components/Screen'
import { joinUrl, wifi, wifiQrText } from '@/lib/net'
import { qrSvg } from '@/lib/qr'
import { parseGame } from '@/lib/types'

export const dynamic = 'force-dynamic'

// /play/screen — the big screen. /play/screen?g=practice shows the practice game.
export default async function ScreenPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams
  const game = parseGame(g)
  const url = joinUrl() + (game === 'practice' ? '?g=practice' : '')
  const w = wifi()
  return (
    <Screen
      game={game}
      joinUrl={url}
      joinQr={await qrSvg(url)}
      wifi={w ? { ssid: w.ssid, password: w.password, qr: await qrSvg(wifiQrText(w)) } : null}
    />
  )
}
