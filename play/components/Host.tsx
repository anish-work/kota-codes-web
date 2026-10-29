'use client'

import { useCallback, useEffect, useState } from 'react'
import { BASE } from '@/lib/base'
import { choicesFor, type GameId, type HostRound, type HostView, type PublicState } from '@/lib/types'
import { useGame, useSecondsLeft } from './useGame'

const PHASE_TEXT: Record<PublicState['phase'], string> = {
  lobby: 'Join screen',
  question: 'Question shown, voting not open',
  voting: 'Voting open',
  closed: 'Voting closed',
  results: 'Showing results',
  answer: 'Showing answer',
  final: 'Final score',
}

export default function Host({ game, authed }: { game: GameId; authed: boolean }) {
  const [loggedIn, setLoggedIn] = useState(authed)
  if (!loggedIn) return <Login onDone={() => setLoggedIn(true)} />
  return <Remote game={game} onLoggedOut={() => setLoggedIn(false)} />
}

function Login({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const res = await fetch(`${BASE}/api/host/login`, { method: 'POST', body: JSON.stringify({ pin }) }).catch(() => null)
    if (res?.ok) return onDone()
    const data = res ? ((await res.json()) as { error?: string }) : null
    setError(data?.error ?? 'Could not reach the game server.')
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-[420px] px-4 pt-12">
      <h1 className="head text-[48px]">Host remote</h1>
      <label className="mt-6 block text-[18px] font-semibold" htmlFor="pin">
        PIN
      </label>
      <input
        id="pin"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="num mt-2 block w-full border-4 border-ink bg-cream px-4 py-3 text-[32px]"
      />
      {error && <p className="mt-3 text-[18px] font-semibold">{error}</p>}
      <button type="submit" className="head mt-4 w-full bg-ink px-4 py-4 text-[32px] text-cream">
        Log in
      </button>
    </form>
  )
}

function Remote({ game, onLoggedOut }: { game: GameId; onLoggedOut: () => void }) {
  const { state, online, serverNow, setState } = useGame(game)
  const [view, setView] = useState<HostView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const loadView = useCallback(async () => {
    const res = await fetch(`${BASE}/api/host/view?g=${game}`, { cache: 'no-store' }).catch(() => null)
    if (res?.status === 401) return onLoggedOut()
    if (res?.ok) setView(await res.json())
  }, [game, onLoggedOut])

  // Refresh the host-only details whenever the game moves.
  const version = state?.version
  const phase = state?.phase
  useEffect(() => {
    void loadView()
  }, [loadView, phase, state?.round?.id, state?.paused])
  useEffect(() => {
    if (version !== undefined && (phase === 'lobby' || phase === 'answer')) void loadView()
  }, [version, phase, loadView])

  const act = async (action: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setConfirm(null)
    const res = await fetch(`${BASE}/api/host/action`, { method: 'POST', body: JSON.stringify({ g: game, action }) }).catch(() => null)
    setBusy(false)
    if (res?.status === 401) return onLoggedOut()
    if (!res?.ok) return setError('Could not reach the game server.')
    const data = (await res.json()) as { state: PublicState }
    setState(data.state)
    void loadView()
  }

  // Dangerous buttons need a second tap within a few seconds.
  const twoTap = (action: string) => {
    if (confirm === action) return act(action)
    setConfirm(action)
    setTimeout(() => setConfirm((c) => (c === action ? null : c)), 4000)
  }

  const secondsLeft = useSecondsLeft(state?.votingEndsAt ?? null, serverNow)
  const finalRound = view?.rounds.find((r) => r.final)
  const otherGame: GameId = game === 'live' ? 'practice' : 'live'

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-16">
      <header className="num flex items-center justify-between border-b-4 border-ink py-3 text-[14px] font-bold uppercase">
        <span>Host · {game === 'live' ? 'Live game' : 'Practice game'}</span>
        <a href={`${BASE}/host?g=${otherGame}`} className="underline">
          Switch to {otherGame}
        </a>
      </header>

      {state && (
        <section className="mt-4 bg-soft p-4" aria-live="polite">
          <div className="num flex flex-wrap justify-between gap-2 text-[15px] font-bold uppercase">
            <span>{state.paused ? 'PAUSED · ' : ''}{PHASE_TEXT[state.phase]}</span>
            <span>
              Kota {state.score.kota} · AI {state.score.ai}
            </span>
          </div>
          {state.round && <p className="mt-2 text-[20px] font-semibold leading-snug">{state.round.label}: {state.round.prompt}</p>}
          <p className="num mt-2 text-[15px]">
            {state.joined} joined · {state.votes} votes{secondsLeft !== null ? ` · ${secondsLeft}s left` : ''}
            {!online && ' · reconnecting'}
          </p>
          {state.tally && (
            <p className="num mt-1 text-[15px]">
              {Object.entries(state.tally)
                .map(([k, v]) => `${k.toUpperCase()} ${v}`)
                .join(' · ')}
            </p>
          )}
        </section>
      )}

      {error && <p className="mt-3 bg-ink p-3 text-[18px] text-cream">{error}</p>}

      <button
        type="button"
        onClick={() => act('next')}
        disabled={busy || state?.phase === 'final'}
        className="head mt-4 w-full bg-green px-4 py-6 text-left text-[40px] text-cream disabled:bg-soft disabled:text-mute"
      >
        Next step
        <span className="num block text-[16px] font-bold tracking-normal text-lime uppercase">{view?.nextStep ?? ''}</span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Btn onClick={() => act('openJoin')}>Open join</Btn>
        <Btn onClick={() => act('nextRound')}>Next round</Btn>
        <Btn onClick={() => act('closeVoting')} disabled={state?.phase !== 'voting'}>
          Close voting
        </Btn>
        <Btn onClick={() => act('showResults')} disabled={!(state?.phase === 'voting' || state?.phase === 'closed')}>
          Show results
        </Btn>
        <Btn onClick={() => act('showAnswer')} disabled={!['voting', 'closed', 'results'].includes(state?.phase ?? '')}>
          Show answer
        </Btn>
        <Btn onClick={() => act('pause')} dark={state?.paused}>
          {state?.paused ? 'Resume' : 'Pause'}
        </Btn>
        <Btn onClick={() => act('undo')} disabled={!view?.canUndo}>
          Undo last step
        </Btn>
        <Btn onClick={() => act('showFinal')} disabled={state?.phase === 'final'}>
          Show final score
        </Btn>
        {finalRound && (
          <Btn
            onClick={() => editRound(game, finalRound.id, { points: finalRound.points === 3 ? 1 : 3 }).then(loadView)}
            disabled={finalRound.played}
            dark={finalRound.points === 3}
          >
            Final round x3: {finalRound.points === 3 ? 'ON' : 'OFF'}
          </Btn>
        )}
        <Btn onClick={() => twoTap('reset')} dark={confirm === 'reset'}>
          {confirm === 'reset' ? 'Tap again to reset' : 'Reset game'}
        </Btn>
      </div>

      <p className="num mt-4 text-[14px]">
        Big screen: <a className="underline" href={`${BASE}/screen${game === 'practice' ? '?g=practice' : ''}`}>{BASE}/screen{game === 'practice' ? '?g=practice' : ''}</a>. Keys there:
        Space = next step, P = pause, Z = undo, F = fullscreen.
      </p>
      {view && (
        <p className="num mt-2 text-[14px] break-all">
          Phones open: {view.joinUrl}
          {view.wifi ? ` · Wifi: ${view.wifi.ssid}` : ' · No wifi set (WIFI_SSID)'}
        </p>
      )}

      <h2 className="head mt-10 text-[36px]">Rounds</h2>
      <p className="mt-1 text-[16px]">Answers are only on this page. Tap a round to edit it.</p>
      <ol className="mt-3 flex flex-col gap-3">
        {view?.rounds.map((r) => (
          <RoundCard key={r.id} game={game} round={r} current={state?.round?.id === r.id} onChange={loadView} />
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Btn onClick={() => twoTap('reload')} dark={confirm === 'reload'}>
          {confirm === 'reload' ? 'Tap again: reload and reset' : 'Reload rounds from file'}
        </Btn>
        <Btn
          onClick={async () => {
            await fetch(`${BASE}/api/host/login`, { method: 'DELETE' })
            onLoggedOut()
          }}
        >
          Log out
        </Btn>
      </div>
      <p className="mt-2 text-[14px]">Reload reads rounds.config.ts again. It clears votes, scores, edits and uploaded photos.</p>
    </div>
  )
}

function Btn({ children, onClick, disabled, dark }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[76px] border-4 px-3 py-3 text-left text-[20px] font-semibold leading-tight ${
        dark ? 'border-ink bg-ink text-lime' : 'border-ink bg-cream text-ink'
      } disabled:border-soft disabled:bg-cream disabled:text-mute`}
    >
      {children}
    </button>
  )
}

async function editRound(game: GameId, round: string, edit: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(`${BASE}/api/host/round`, { method: 'PATCH', body: JSON.stringify({ g: game, round, edit }) }).catch(() => null)
  if (!res) return 'Could not reach the game server.'
  if (res.ok) return null
  return ((await res.json()) as { error?: string }).error ?? 'Could not save.'
}

const answerText = (a: string | null) => (a === 'myth' ? 'MYTH' : a === 'fact' ? 'FACT' : a ?? 'none')

function RoundCard({ game, round, current, onChange }: { game: GameId; round: HostRound; current: boolean; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(round)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => setDraft(round), [round])

  const save = async () => {
    const error = await editRound(game, round.id, {
      label: draft.label,
      prompt: draft.prompt,
      answer: round.kind === 'opinion' ? null : draft.answer,
      note: draft.note,
    })
    setMsg(error ?? 'Saved.')
    onChange()
  }

  const upload = async (slot: number, file: File) => {
    setMsg('Uploading…')
    try {
      const blob = await shrink(file)
      const res = await fetch(`${BASE}/api/host/photo?g=${game}&round=${encodeURIComponent(round.id)}&slot=${slot}`, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      })
      setMsg(res.ok ? 'Photo saved.' : (((await res.json()) as { error?: string }).error ?? 'Upload failed.'))
    } catch {
      setMsg('Upload failed.')
    }
    onChange()
  }

  return (
    <li className={`border-4 ${current ? 'border-green' : 'border-ink'} ${round.skipped ? 'opacity-50' : ''}`}>
      <button type="button" onClick={() => setOpen(!open)} className="block w-full p-3 text-left">
        <span className="num block text-[13px] font-bold uppercase">
          {round.label}
          {current && ' · now'}
          {round.played && ' · played'}
          {round.skipped && ' · skipped'}
          {round.points > 1 && ` · ${round.points}x`}
        </span>
        <span className="mt-1 block text-[18px] leading-snug font-semibold">{round.prompt}</span>
        <span className="num mt-1 block text-[14px]">Answer: {round.kind === 'opinion' ? 'none (opinion)' : answerText(round.answer)}</span>
      </button>
      {open && (
        <div className="border-t-4 border-ink p-3">
          <Field label="Label">
            <input className="w-full border-2 border-ink bg-cream p-2 text-[18px]" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </Field>
          <Field label="Question">
            <textarea className="w-full border-2 border-ink bg-cream p-2 text-[18px]" rows={2} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} />
          </Field>
          {round.kind !== 'opinion' && (
            <Field label="Right answer">
              <div className="flex gap-2">
                {choicesFor(round.kind).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, answer: c })}
                    className={`num border-2 border-ink px-4 py-2 text-[18px] font-bold ${draft.answer === c ? 'bg-ink text-lime' : 'bg-cream'}`}
                  >
                    {answerText(c)}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Note shown with the answer (optional)">
            <input className="w-full border-2 border-ink bg-cream p-2 text-[18px]" value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </Field>
          {round.kind === 'pick4' && (
            <Field label="Photos (shown on the big screen only)">
              <div className="grid grid-cols-2 gap-2">
                {['A', 'B', 'C', 'D'].map((l, i) => (
                  <label key={l} className="block cursor-pointer border-2 border-ink">
                    <span className="num block bg-ink px-2 text-[16px] font-bold text-cream">{l}</span>
                    <span className="block aspect-[4/3] bg-soft">
                      {round.photos[i] && <img src={round.photos[i]} alt={`Photo ${l}`} className="h-full w-full object-cover" />}
                    </span>
                    <span className="block px-2 py-1 text-[14px] underline">Choose photo</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(i, e.target.files[0])} />
                  </label>
                ))}
              </div>
            </Field>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={save} className="bg-ink px-4 py-3 text-[18px] font-semibold text-cream">
              Save
            </button>
            {!round.final && (
              <button
                type="button"
                onClick={async () => {
                  setMsg(await editRound(game, round.id, { skipped: !round.skipped }))
                  onChange()
                }}
                className="border-2 border-ink px-4 py-3 text-[18px] font-semibold"
              >
                {round.skipped ? 'Put back in' : 'Skip this round'}
              </button>
            )}
          </div>
          {msg && <p className="mt-2 text-[16px]">{msg}</p>}
        </div>
      )}
    </li>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[15px] font-semibold">{label}</p>
      {children}
    </div>
  )
}

// Shrink a photo to at most 1600px wide before upload, so the screen loads it fast.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / bitmap.width, 1200 / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85))
}
