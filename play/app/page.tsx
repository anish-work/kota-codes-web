import Phone from '@/components/Phone'
import { parseGame } from '@/lib/types'

// /play — the phone page. /play?g=practice joins the practice game.
export default async function PhonePage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams
  return <Phone game={parseGame(g)} />
}
