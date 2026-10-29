'use client'

import { useCallback, useEffect, useState } from 'react'
import { BASE } from '@/lib/base'
import type { GameId, PublicState } from '@/lib/types'
import { useGame, useSecondsLeft } from './useGame'

interface Props {
  game: GameId
  joinUrl: string
  joinQr: string
  wifi: { ssid: string; password: string; qr: string } | null
}

const W = 1920
const H = 1080
const label = (c: string) => (c === 'myth' ? 'MYTH' : c === 'fact' ? 'FACT' : c)

export default function Screen({ game, joinUrl, joinQr, wifi }: Props) {
  const { state, serverNow, setState } = useGame(game)
  const scale = useStageScale()
  const [notice, setNotice] = useState<string | null>(null)

  // Keyboard: Space = next step, P = pause, Z = undo, F = fullscreen.
  const send = useCallback(
    async (action: string) => {
      const res = await fetch(`${BASE}/api/host/action`, { method: 'POST', body: JSON.stringify({ g: game, action }) }).catch(() => null)
      if (res?.status === 401) setNotice('Keys need the host login. Open /play/host on this laptop and enter the PIN.')
      else if (!res?.ok) setNotice('Could not reach the game server.')
      else {
        setNotice(null)
        const data = (await res.json()) as { state: PublicState }
        setState(data.state)
      }
    },
    [game, setState],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'enter' || k === 'arrowright') {
        e.preventDefault()
        void send('next')
      } else if (k === 'p') void send('pause')
      else if (k === 'z') void send('undo')
      else if (k === 'f') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [send])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const shortUrl = joinUrl.replace(/^https?:\/\//, '')

  return (
    <div className="fixed inset-0 overflow-hidden bg-cream">
      <div
        className="absolute top-1/2 left-1/2 bg-cream"
        style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        {state && (
          <>
            <TopBar state={state} />
            <div className="absolute inset-x-[80px] top-[200px] bottom-[60px]">
              {!state.paused && <Body state={state} serverNow={serverNow} joinQr={joinQr} wifi={wifi} shortUrl={shortUrl} />}
            </div>
            {state.phase !== 'lobby' && <CornerQr joinQr={joinQr} wifi={wifi} shortUrl={shortUrl} />}
          </>
        )}
        {notice && <p className="num absolute right-[40px] bottom-[40px] max-w-[760px] bg-ink px-6 py-4 text-[24px] text-cream">{notice}</p>}
      </div>
    </div>
  )
}

// Fit the 1920x1080 design to whatever the window is.
function useStageScale() {
  const [scale, setScale] = useState(0)
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

function TopBar({ state }: { state: PublicState }) {
  const tag = state.game === 'practice' ? 'Practice game' : state.round?.label
  return (
    <>
      <div className="absolute top-[40px] left-[80px]">
        <p className="head text-[56px] uppercase">Kota vs AI</p>
        {tag && <p className="num mt-2 text-[28px] font-bold uppercase">{tag}</p>}
      </div>
      <div className="num absolute top-[40px] right-[80px] flex text-[28px] font-bold uppercase" aria-label="Score">
        <div className="w-[170px] bg-green px-5 py-3 text-cream">
          Kota<span className="block text-[72px] leading-none">{state.score.kota}</span>
        </div>
        <div className="w-[170px] bg-ink px-5 py-3 text-cream">
          AI<span className="block text-[72px] leading-none">{state.score.ai}</span>
        </div>
      </div>
    </>
  )
}

function CornerQr({ joinQr, wifi, shortUrl }: Pick<Props, 'joinQr' | 'wifi'> & { shortUrl: string }) {
  return (
    <div className="absolute bottom-[40px] left-[40px] flex items-end gap-4">
      {wifi && <SmallQr svg={wifi.qr} caption="1 Wifi" />}
      <SmallQr svg={joinQr} caption={wifi ? '2 Play' : 'Play'} />
      <p className="num mb-1 text-[20px] leading-tight">
        Late? Scan to join.
        <br />
        {shortUrl}
      </p>
    </div>
  )
}

function SmallQr({ svg, caption }: { svg: string; caption: string }) {
  return (
    <div className="w-[130px]">
      <p className="num mb-1 text-[18px] font-bold uppercase">{caption}</p>
      <div className="w-[130px] bg-cream p-2 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

function Body({
  state,
  serverNow,
  joinQr,
  wifi,
  shortUrl,
}: {
  state: PublicState
  serverNow: () => number
  joinQr: string
  wifi: Props['wifi']
  shortUrl: string
}) {
  const secondsLeft = useSecondsLeft(state.votingEndsAt, serverNow)
  const round = state.round

  if (state.phase === 'lobby') return <Lobby state={state} joinQr={joinQr} wifi={wifi} shortUrl={shortUrl} />
  if (state.phase === 'final') return <Final state={state} />
  if (!round) return null

  const photos = round.kind === 'pick4'

  if (state.phase === 'question' || state.phase === 'voting' || state.phase === 'closed') {
    return (
      <div className="flex h-full flex-col">
        <h1 className={`head max-w-[1700px] ${photos ? 'text-[84px]' : 'text-[124px]'}`}>{round.prompt}</h1>
        {round.final && round.points > 1 && <p className="num mt-4 text-[36px] font-bold uppercase">Triple points round</p>}
        {photos && <Photos photos={round.photos} className="mt-8" />}
        <div className="mt-auto mb-[150px] flex items-stretch gap-6">
          {state.phase === 'question' && <p className="num self-end text-[44px] font-bold uppercase">Get ready to vote</p>}
          {state.phase === 'voting' && (
            <div className={`num flex w-[300px] items-center justify-center bg-ink text-lime ${photos ? 'h-[150px] text-[120px]' : 'h-[220px] text-[180px]'} font-bold`}>
              {secondsLeft ?? ''}
            </div>
          )}
          {state.phase === 'closed' && (
            <div className={`head flex w-[420px] items-center justify-center bg-ink text-cream ${photos ? 'h-[150px] text-[84px]' : 'h-[220px] text-[110px]'}`}>
              TIME&apos;S UP
            </div>
          )}
          {state.phase !== 'question' && (
            <div className="flex flex-col justify-end">
              <span className={`num font-bold leading-none ${photos ? 'text-[96px]' : 'text-[150px]'}`}>{state.votes}</span>
              <span className="num text-[32px] font-bold uppercase">{state.votes === 1 ? 'vote' : 'votes'}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Results and answer.
  const tally = state.tally ?? {}
  const total = Object.values(tally).reduce((a, b) => a + b, 0)
  const answer = state.phase === 'answer' ? state.answer : null
  const reveal = state.phase === 'answer'

  return (
    <div className="flex h-full flex-col">
      <h1 className="head max-w-[1500px] text-[64px]">{round.prompt}</h1>
      {photos && reveal ? (
        <Photos photos={round.photos} real={answer} tally={tally} total={total} className="mt-6" />
      ) : (
        <Bars tally={tally} total={total} answer={answer} reveal={reveal} photos={photos ? round.photos : null} />
      )}
      {reveal && <Verdict state={state} total={total} correct={answer ? (tally[answer] ?? 0) : 0} />}
      {!reveal && <p className="num mt-auto mb-[150px] ml-[640px] text-[32px] font-bold uppercase">{total} votes</p>}
    </div>
  )
}

function Lobby({ state, joinQr, wifi, shortUrl }: { state: PublicState; joinQr: string; wifi: Props['wifi']; shortUrl: string }) {
  return (
    <div className="flex h-full items-start justify-between gap-16">
      <div className="flex h-full max-w-[640px] flex-col">
        <h1 className="head text-[150px] uppercase">AI: myth or fact?</h1>
        <p className="mt-8 text-[40px] leading-tight">Scan with your phone camera. Vote MYTH or FACT. Beat the AI.</p>
        <div className="mt-auto mb-[20px]">
          <span className="num block text-[160px] leading-none font-bold">{state.joined}</span>
          <span className="num text-[36px] font-bold uppercase">joined</span>
        </div>
      </div>
      <div className="flex gap-10">
        {wifi && (
          <BigQr step="1" title="Join the wifi" svg={wifi.qr}>
            <p className="num text-[30px] leading-snug">
              Wifi: <b>{wifi.ssid}</b>
              {wifi.password && (
                <>
                  <br />
                  Password: <b>{wifi.password}</b>
                </>
              )}
            </p>
          </BigQr>
        )}
        <BigQr step={wifi ? '2' : ''} title="Open the game" svg={joinQr}>
          <p className="num text-[28px] leading-snug font-bold break-words">{shortUrl}</p>
        </BigQr>
      </div>
    </div>
  )
}

function BigQr({ step, title, svg, children }: { step: string; title: string; svg: string; children: React.ReactNode }) {
  return (
    <div className="w-[480px]">
      <p className="head mb-4 text-[56px]">
        {step && <span className="num mr-4 inline-block bg-ink px-4 text-[44px] text-lime">{step}</span>}
        {title}
      </p>
      <div className="border-[16px] border-cream bg-cream [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Photos({
  photos,
  real,
  tally,
  total,
  className = '',
}: {
  photos: string[]
  real?: string | null
  tally?: Record<string, number>
  total?: number
  className?: string
}) {
  const letters = ['A', 'B', 'C', 'D']
  return (
    <div className={`grid grid-cols-4 gap-6 ${className}`}>
      {letters.map((l, i) => {
        const isReal = real === l
        const dim = real && !isReal
        return (
          <figure key={l} className={`relative border-[10px] ${isReal ? 'border-lime bg-green' : 'border-transparent'}`}>
            <div className={`aspect-[4/3] w-full bg-soft ${dim ? 'opacity-35' : ''}`}>
              {photos[i] && <img src={photos[i]} alt={`Photo ${l}`} className="h-full w-full object-cover" />}
            </div>
            <figcaption className={`head absolute top-0 left-0 px-4 py-1 text-[64px] ${isReal ? 'bg-lime text-ink' : 'bg-ink text-cream'}`}>{l}</figcaption>
            {tally && (
              <p className={`num px-3 py-2 text-[34px] font-bold ${isReal ? 'text-lime' : ''}`}>
                {pct(tally[l] ?? 0, total ?? 0)}%{isReal && ' REAL'}
              </p>
            )}
          </figure>
        )
      })}
    </div>
  )
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0
}

function Bars({
  tally,
  total,
  answer,
  reveal,
  photos,
}: {
  tally: Record<string, number>
  total: number
  answer: string | null
  reveal: boolean
  photos: string[] | null
}) {
  const keys = Object.keys(tally)
  const four = keys.length === 4
  const MAX = four ? 1180 : 1240
  return (
    <div className={`mt-8 flex flex-col ${four ? 'gap-4' : 'gap-6'}`}>
      {keys.map((k, i) => {
        const p = pct(tally[k], total)
        // MYTH = ink, FACT = green: they differ in lightness and label, not only colour.
        const fill = k === 'fact' ? 'bg-green' : 'bg-ink'
        const wrong = reveal && answer !== null && answer !== k
        return (
          <div key={k} className={`flex items-center gap-8 ${wrong ? 'opacity-30' : ''}`}>
            <div className="flex w-[300px] shrink-0 items-center gap-4">
              {photos && <img src={photos[i]} alt="" className="h-[90px] w-[120px] bg-soft object-cover" />}
              <span className={`head ${four ? 'text-[80px]' : 'text-[110px]'}`}>{label(k)}</span>
            </div>
            <div className={`${four ? 'h-[100px]' : 'h-[150px]'} ${fill}`} style={{ width: Math.max(12, (p / 100) * MAX) }} />
            <span className={`num font-bold ${four ? 'text-[64px]' : 'text-[100px]'}`}>{p}%</span>
          </div>
        )
      })}
    </div>
  )
}

function Verdict({ state, total, correct }: { state: PublicState; total: number; correct: number }) {
  const pts = state.round && state.round.points > 1 ? `${state.round.points} POINTS` : 'THE POINT'
  if (!state.answer) {
    return (
      <div className="mt-auto mb-[150px] ml-[360px] bg-soft px-10 py-8">
        <p className="head text-[72px]">{state.note ?? 'No right answer.'}</p>
        <p className="num mt-3 text-[32px] font-bold uppercase">No points this round</p>
      </div>
    )
  }
  const kota = state.winner === 'kota'
  const none = state.winner === 'none'
  return (
    <div className={`mt-auto mb-[150px] ml-[360px] flex items-center justify-between px-10 py-8 ${kota ? 'bg-green text-lime' : none ? 'bg-soft' : 'bg-ink text-cream'}`}>
      <p className="head text-[110px]">{none ? 'NO VOTES' : kota ? `KOTA GETS ${pts}` : `AI GETS ${pts}`}</p>
      <p className="num text-right text-[36px] leading-tight font-bold uppercase">
        {state.round?.kind === 'pick4' ? `${state.answer} is real` : `It's a ${label(state.answer)}`}
        <br />
        {pct(correct, total)}% got it right
      </p>
    </div>
  )
}

function Final({ state }: { state: PublicState }) {
  const kota = state.result === 'kota'
  const title = kota ? 'KOTA WINS' : state.result === 'ai' ? 'AI WINS' : "IT'S A DRAW"
  return (
    <div className={`flex h-[calc(100%-170px)] flex-col justify-center px-16 ${kota ? 'bg-green text-lime' : 'bg-ink text-cream'}`}>
      <h1 className="head text-[260px]">{title}</h1>
      <p className="num mt-4 text-[88px] font-bold">
        KOTA {state.score.kota} <span className="opacity-60">·</span> AI {state.score.ai}
      </p>
      <p className="head mt-8 text-[64px] text-cream">Follow @kota.codes</p>
    </div>
  )
}
