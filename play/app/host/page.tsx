import Host from '@/components/Host'
import { isHost } from '@/lib/auth'
import { parseGame } from '@/lib/types'

export const dynamic = 'force-dynamic'

// /play/host — the host remote. Answers only load after the PIN.
export default async function HostPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams
  return <Host game={parseGame(g)} authed={await isHost()} />
}
