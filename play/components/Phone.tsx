'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BASE } from '@/lib/base'
import { choicesFor, type GameId, type PublicState, type RoundKind } from '@/lib/types'
import { getDeviceId } from './device'
import { useGame, useSecondsLeft } from './useGame'

type Status = 'sending' | 'saved' | 'retrying' | 'late'
interface Pick {
  roundId: string
  choice: string
  status: Status
}

const label = (choice: string) => (choice === 'myth' ? 'MYTH' : choice === 'fact' ? 'FACT' : choice)

export default function Phone({ game }: { game: GameId }) {
  const [device, setDevice] = useState<string | null>(null)
  useEffect(() => setDevice(getDeviceId()), [])

  const { state, online, mine, serverNow, refresh } = useGame(game, device)
  const [pick, setPick] = useState<Pick | null>(null)
  const latest = useRef<PublicState | null>(null)
  latest.current = state
  const pickRef = useRef<Pick | null>(null)
  pickRef.current = pick

  // Say hello once, so the big screen can count this phone.
  useEffect(() => {
    if (!device) return
    const send = (tries: number) =>
      fetch(`${BASE}/api/join`, { method: 'POST', body: JSON.stringify({ g: game, d: device }) }).catch(() => {
        if (tries < 20) setTimeout(() => send(tries + 1), 2000)
      })
    void send(0)
  }, [device, game])

  // The server's record of this phone's vote wins over what the page remembers.
  useEffect(() => {
    if (mine && (!pick || pick.roundId !== mine.roundId || pick.status === 'saved')) {
      setPick({ roundId: mine.roundId, choice: mine.choice, status: 'saved' })
    }
  }, [mine]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch the confirmed vote when the answer is shown, in case the stream missed it.
  const phase = state?.phase
  useEffect(() => {
    if (phase === 'answer') void refresh()
  }, [phase, refresh])

  const vote = useCallback(
    async (choice: string, attempt = 0) => {
      const s = latest.current
      if (!device || !s?.round || s.phase !== 'voting') return
      const roundId = s.round.id
      setPick({ roundId, choice, status: attempt ? 'retrying' : 'sending' })
      try {
        const res = await fetch(`${BASE}/api/vote`, {
          method: 'POST',
          body: JSON.stringify({ g: game, d: device, round: roundId, choice }),
        })
        if (res.ok) {
          setPick((p) => (p && p.roundId === roundId && p.choice === choice ? { ...p, status: 'saved' } : p))
        } else if (res.status === 409) {
          setPick((p) => (p && p.roundId === roundId && p.choice === choice ? { ...p, status: 'late' } : p))
          void refresh()
        }
      } catch {
        // No connection: keep trying quietly while voting is still open.
        setTimeout(() => {
          const p = pickRef.current
          if (p && p.roundId === roundId && p.choice === choice && latest.current?.phase === 'voting') void vote(choice, attempt + 1)
        }, 1500)
      }
    },
    [device, game, refresh],
  )

  const secondsLeft = useSecondsLeft(state?.votingEndsAt ?? null, serverNow)

  if (!state) {
    return (
      <Shell score={null}>
        <p className="head text-[40px]">Loading…</p>
      </Shell>
    )
  }

  const round = state.round
  const myPick = round && pick?.roundId === round.id && pick.status !== 'late' ? pick : null
  const confirmed = myPick?.status === 'saved' ? myPick.choice : null

  return (
    <Shell score={state.score} offline={!online}>
      {state.phase === 'lobby' && (
        <>
          <h1 className="head text-[56px]">You&apos;re in.</h1>
          <p className="mt-4 text-[20px] leading-snug">Keep this page open. The questions will show up here.</p>
          <p className="mt-6 text-[20px] leading-snug">
            When a question comes, tap <b className="font-semibold">MYTH</b> or <b className="font-semibold">FACT</b>.
          </p>
        </>
      )}

      {round && ['question', 'voting', 'closed', 'results'].includes(state.phase) && (
        <>
          <div className="num flex items-baseline justify-between text-[14px] uppercase">
            <span>{round.label}</span>
            {state.phase === 'voting' && secondsLeft !== null && <span className="text-[20px] font-bold">{secondsLeft}s</span>}
          </div>
          <h1 className="head mt-3 text-[34px]">{round.prompt}</h1>
          {round.final && round.points > 1 && <p className="num mt-2 text-[14px] uppercase">{round.points}x points</p>}

          {state.phase === 'question' && (
            <>
              <Buttons kind={round.kind} picked={null} disabled onPick={() => {}} />
              <p className="mt-4 text-[18px]">Get ready. Voting opens in a moment.</p>
            </>
          )}

          {state.phase === 'voting' && (
            <>
              <Buttons kind={round.kind} picked={myPick?.choice ?? null} onPick={(c) => vote(c)} />
              <p className="mt-4 min-h-[3em] text-[18px] leading-snug" aria-live="polite">
                {!myPick && (pick?.status === 'late' ? 'Too late: voting had closed.' : 'Tap your answer.')}
                {myPick?.status === 'sending' && 'Sending…'}
                {myPick?.status === 'retrying' && 'No connection. Trying again…'}
                {myPick?.status === 'saved' && 'Saved. You can change it until time runs out.'}
              </p>
            </>
          )}

          {(state.phase === 'closed' || state.phase === 'results') && (
            <div className="mt-6 border-t-4 border-ink pt-4">
              <p className="head text-[32px]">Voting closed.</p>
              <p className="mt-2 text-[20px]">
                {confirmed ? (
                  <>
                    Your pick: <b className="font-semibold">{label(confirmed)}</b>
                  </>
                ) : (
                  'You did not vote this time.'
                )}
              </p>
              <p className="mt-2 text-[20px]">Look at the big screen.</p>
            </div>
          )}
        </>
      )}

      {state.phase === 'answer' && round && <Answer state={state} confirmed={confirmed} />}

      {state.phase === 'final' && <Final state={state} />}
    </Shell>
  )
}

function Shell({
  score,
  offline,
  children,
}: {
  score: { kota: number; ai: number } | null
  offline?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col">
      <header className="num flex items-center justify-between border-b-4 border-ink px-4 py-3 text-[14px] font-bold uppercase">
        <span>Kota vs AI</span>
        {score && (
          <span>
            Kota {score.kota} <span className="text-mute">·</span> AI {score.ai}
          </span>
        )}
      </header>
      <main className="flex-1 px-4 pt-6 pb-10">{children}</main>
      {offline && (
        <p className="num sticky bottom-0 bg-ink px-4 py-2 text-[13px] text-cream" role="status">
          Reconnecting…
        </p>
      )}
    </div>
  )
}

function Buttons({
  kind,
  picked,
  disabled,
  onPick,
}: {
  kind: RoundKind
  picked: string | null
  disabled?: boolean
  onPick: (choice: string) => void
}) {
  const choices = choicesFor(kind)
  const four = choices.length === 4
  return (
    <div className={`mt-6 grid gap-3 ${four ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {choices.map((c) => {
        const on = picked === c
        const off = disabled || (picked !== null && !on)
        // MYTH is ink, FACT is green: different lightness, not only colour.
        const base = c === 'fact' ? 'bg-green text-cream' : c === 'myth' ? 'bg-ink text-cream' : 'bg-ink text-cream'
        return (
          <button
            key={c}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onPick(c)}
            className={`head flex flex-col items-center justify-center border-4 ${four ? 'h-[128px] text-[64px]' : 'h-[min(24dvh,170px)] min-h-[112px] text-[64px]'} ${
              off ? 'border-soft bg-soft text-mute' : `${base} ${on ? 'border-lime' : 'border-transparent'}`
            }`}
          >
            {label(c)}
            {on && <span className="num mt-1 text-[13px] font-bold tracking-wide text-lime">YOUR PICK</span>}
          </button>
        )
      })}
    </div>
  )
}

function Answer({ state, confirmed }: { state: PublicState; confirmed: string | null }) {
  const opinion = !state.answer
  const right = !opinion && confirmed === state.answer
  const box = opinion ? 'bg-soft text-ink' : !confirmed ? 'bg-soft text-ink' : right ? 'bg-green text-lime' : 'bg-ink text-cream'
  const headline = opinion ? 'No right answer this time.' : !confirmed ? 'You did not vote this time.' : right ? 'You got it right' : 'Not this time'
  return (
    <>
      <p className="num text-[14px] uppercase">{state.round?.label}</p>
      <div className={`mt-3 px-4 py-6 ${box}`}>
        <p className="head text-[48px]">{headline}</p>
      </div>
      {opinion ? (
        state.note && <p className="mt-4 text-[22px] leading-snug font-semibold">{state.note}</p>
      ) : (
        <p className="mt-4 text-[22px]">
          The answer: <b className="font-semibold">{label(state.answer!)}</b>
        </p>
      )}
      <p className="mt-2 text-[20px]">
        {state.winner === 'kota'
          ? `Kota gets ${state.round && state.round.points > 1 ? `${state.round.points} points` : 'the point'}.`
          : state.winner === 'ai'
            ? `AI gets ${state.round && state.round.points > 1 ? `${state.round.points} points` : 'the point'}.`
            : 'No points this round.'}
      </p>
      <Score score={state.score} />
    </>
  )
}

function Score({ score }: { score: { kota: number; ai: number } }) {
  return (
    <div className="mt-6 grid grid-cols-2 border-4 border-ink">
      <div className="bg-green px-4 py-3 text-cream">
        <p className="num text-[13px] font-bold uppercase">Kota</p>
        <p className="num text-[44px] font-bold leading-none">{score.kota}</p>
      </div>
      <div className="bg-ink px-4 py-3 text-cream">
        <p className="num text-[13px] font-bold uppercase">AI</p>
        <p className="num text-[44px] font-bold leading-none">{score.ai}</p>
      </div>
    </div>
  )
}

function Final({ state }: { state: PublicState }) {
  const title = state.result === 'kota' ? 'KOTA WINS' : state.result === 'ai' ? 'AI WINS' : "IT'S A DRAW"
  return (
    <>
      <p className="num text-[14px] uppercase">Final score</p>
      <h1 className={`head mt-3 px-4 py-6 text-[64px] ${state.result === 'kota' ? 'bg-green text-lime' : 'bg-ink text-cream'}`}>{title}</h1>
      <Score score={state.score} />
      <p className="mt-6 text-[20px]">Thanks for playing.</p>
      <a href="https://www.instagram.com/kota.codes/" className="mt-6 block bg-ink px-4 py-5 text-cream">
        <span className="block text-[18px]">Follow</span>
        <span className="head block text-[44px] text-lime">@kota.codes</span>
      </a>
    </>
  )
}
