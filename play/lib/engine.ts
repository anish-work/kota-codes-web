import type { DatabaseSync } from 'node:sqlite'
import { openDb, seedRounds } from './db'
import {
  choicesFor,
  GAME_IDS,
  VOTING_MS,
  type GameId,
  type HostRound,
  type Phase,
  type PublicState,
  type RoundKind,
  type Winner,
} from './types'

// Votes that leave a phone just before zero still count.
const GRACE_MS = 1_000
// Join and vote counts go out at most this often, not once per vote.
const COUNT_THROTTLE_MS = 250

interface GameRow {
  id: GameId
  phase: Phase
  paused: number
  round_id: string | null
  voting_ends_at: number | null
  version: number
}

interface RoundRow {
  id: string
  game_id: GameId
  position: number
  label: string
  kind: RoundKind
  prompt: string
  answer: string | null
  note: string | null
  points: number
  skipped: number
  final: number
  photos: string
}

interface ResultRow {
  round_id: string
  game_id: GameId
  total: number
  correct: number
  winner: Winner
  points: number
}

interface Snapshot {
  phase: Phase
  paused: number
  round_id: string | null
  voting_ends_at: number | null
  results: ResultRow[]
}

type Listener = (message: string) => void

interface Hub {
  db: DatabaseSync
  listeners: Map<GameId, Set<Listener>>
  closeTimers: Map<GameId, NodeJS.Timeout>
  countTimers: Map<GameId, NodeJS.Timeout>
}

// Next.js can load this module more than once (route handlers, pages), so the
// database handle, listeners and timers live on globalThis: one per process.
const store = globalThis as unknown as { __kotaHub?: Hub }

function hub(): Hub {
  if (!store.__kotaHub) {
    store.__kotaHub = { db: openDb(), listeners: new Map(), closeTimers: new Map(), countTimers: new Map() }
    for (const id of GAME_IDS) syncCloseTimer(id)
  }
  return store.__kotaHub
}

const db = () => hub().db

function game(id: GameId): GameRow {
  return db().prepare('select * from games where id = ?').get(id) as unknown as GameRow
}

function rounds(id: GameId): RoundRow[] {
  return db().prepare('select * from rounds where game_id = ? order by position').all(id) as unknown as RoundRow[]
}

function round(roundId: string | null): RoundRow | undefined {
  if (!roundId) return undefined
  return db().prepare('select * from rounds where id = ?').get(roundId) as unknown as RoundRow | undefined
}

function nextRound(g: GameRow): RoundRow | undefined {
  const current = round(g.round_id)
  return rounds(g.id).find((r) => !r.skipped && (!current || r.position > current.position))
}

function results(id: GameId): ResultRow[] {
  return db().prepare('select * from round_results where game_id = ?').all(id) as unknown as ResultRow[]
}

function score(id: GameId) {
  const s = { kota: 0, ai: 0 }
  for (const r of results(id)) if (r.winner !== 'none') s[r.winner] += r.points
  return s
}

function tally(r: RoundRow): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(choicesFor(r.kind).map((c) => [c, 0]))
  const rows = db().prepare('select choice, count(*) as n from votes where round_id = ? group by choice').all(r.id) as unknown as {
    choice: string
    n: number
  }[]
  for (const row of rows) if (row.choice in counts) counts[row.choice] = row.n
  return counts
}

function count(sql: string, arg: string): number {
  return (db().prepare(sql).get(arg) as { n: number }).n
}

// ---- What everyone sees ---------------------------------------------------

export function publicState(id: GameId): PublicState {
  const g = game(id)
  const r = round(g.round_id)
  const showSplit = g.phase === 'results' || g.phase === 'answer'
  const showAnswer = g.phase === 'answer'
  const result = r ? results(id).find((x) => x.round_id === r.id) : undefined
  const s = score(id)
  return {
    game: id,
    version: g.version,
    phase: g.phase,
    paused: !!g.paused,
    serverNow: Date.now(),
    votingEndsAt: g.phase === 'voting' ? g.voting_ends_at : null,
    joined: count('select count(*) as n from joins where game_id = ?', id),
    votes: r ? count('select count(*) as n from votes where round_id = ?', r.id) : 0,
    score: s,
    round:
      r && g.phase !== 'lobby' && g.phase !== 'final'
        ? {
            id: r.id,
            label: r.label,
            kind: r.kind,
            prompt: r.prompt,
            photos: JSON.parse(r.photos),
            points: r.points,
            final: !!r.final,
          }
        : null,
    tally: showSplit && r ? tally(r) : null,
    answer: showAnswer && r ? r.answer : null,
    note: showAnswer && r ? r.note : null,
    winner: showAnswer ? (result?.winner ?? 'none') : null,
    result: g.phase === 'final' ? (s.kota > s.ai ? 'kota' : s.ai > s.kota ? 'ai' : 'draw') : null,
  }
}

export function subscribe(id: GameId, listener: Listener): () => void {
  const h = hub()
  let set = h.listeners.get(id)
  if (!set) h.listeners.set(id, (set = new Set()))
  set.add(listener)
  return () => set.delete(listener)
}

function broadcast(id: GameId) {
  db().prepare('update games set version = version + 1 where id = ?').run(id)
  const set = hub().listeners.get(id)
  if (!set?.size) return
  const message = JSON.stringify(publicState(id))
  for (const listener of set) listener(message)
}

function broadcastCountsSoon(id: GameId) {
  const timers = hub().countTimers
  if (timers.has(id)) return
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id)
      broadcast(id)
    }, COUNT_THROTTLE_MS),
  )
}

// ---- Phones ----------------------------------------------------------------

export function join(id: GameId, device: string) {
  const res = db().prepare('insert or ignore into joins (game_id, device_id, joined_at) values (?, ?, ?)').run(id, device, Date.now())
  if (res.changes > 0) broadcastCountsSoon(id)
}

export type VoteResult = { ok: true; choice: string } | { ok: false; reason: 'closed' | 'invalid' }

export function vote(id: GameId, device: string, roundId: string, choice: string): VoteResult {
  const g = game(id)
  const r = round(g.round_id)
  if (!r || r.id !== roundId || g.phase !== 'voting' || !g.voting_ends_at || Date.now() > g.voting_ends_at + GRACE_MS) {
    return { ok: false, reason: 'closed' }
  }
  if (!choicesFor(r.kind).includes(choice)) return { ok: false, reason: 'invalid' }
  // The primary key (round_id, device_id) keeps it to one vote per phone per round;
  // voting again just changes that phone's pick.
  db()
    .prepare(
      `insert into votes (round_id, device_id, choice, updated_at) values (?, ?, ?, ?)
       on conflict (round_id, device_id) do update set choice = excluded.choice, updated_at = excluded.updated_at`,
    )
    .run(r.id, device, choice, Date.now())
  db().prepare('insert or ignore into joins (game_id, device_id, joined_at) values (?, ?, ?)').run(id, device, Date.now())
  broadcastCountsSoon(id)
  return { ok: true, choice }
}

export function myVote(id: GameId, device: string): { roundId: string; choice: string } | null {
  const g = game(id)
  if (!g.round_id) return null
  const row = db().prepare('select choice from votes where round_id = ? and device_id = ?').get(g.round_id, device) as
    | { choice: string }
    | undefined
  return row ? { roundId: g.round_id, choice: row.choice } : null
}

// ---- Host ------------------------------------------------------------------

function snapshot(g: GameRow) {
  const snap: Snapshot = {
    phase: g.phase,
    paused: g.paused,
    round_id: g.round_id,
    voting_ends_at: g.voting_ends_at,
    results: results(g.id),
  }
  db().prepare('insert into history (game_id, snapshot, created_at) values (?, ?, ?)').run(g.id, JSON.stringify(snap), Date.now())
}

function setGame(id: GameId, fields: Partial<Omit<GameRow, 'id' | 'version'>>) {
  const keys = Object.keys(fields) as (keyof typeof fields)[]
  if (!keys.length) return
  const sql = `update games set ${keys.map((k) => `${k} = ?`).join(', ')} where id = ?`
  db()
    .prepare(sql)
    .run(...keys.map((k) => fields[k] ?? null), id)
}

// Every host step saves a snapshot first (so Undo can go back), then tells everyone.
// change() may write (e.g. a round result) and returns the game fields to set,
// or null for "nothing to do here", which rolls everything back.
function step(id: GameId, change: (g: GameRow) => Partial<Omit<GameRow, 'id' | 'version'>> | null) {
  const g = game(id)
  db().exec('begin')
  try {
    snapshot(g)
    const fields = change(g)
    if (!fields) {
      db().exec('rollback')
      return
    }
    setGame(id, fields)
    db().exec('commit')
  } catch (err) {
    db().exec('rollback')
    throw err
  }
  syncCloseTimer(id)
  broadcast(id)
}

function goToNextRound(g: GameRow) {
  const r = nextRound(g)
  if (!r) return { phase: 'final' as Phase, voting_ends_at: null }
  return { phase: 'question' as Phase, round_id: r.id, voting_ends_at: null }
}

function recordResult(g: GameRow) {
  const r = round(g.round_id)
  if (!r) return
  const counts = tally(r)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const scored = r.kind !== 'opinion' && r.answer !== null
  const correct = scored ? (counts[r.answer!] ?? 0) : 0
  // More than half right: Kota scores. Otherwise AI does. No votes or no right answer: nobody.
  const winner: Winner = !scored || total === 0 ? 'none' : correct * 2 > total ? 'kota' : 'ai'
  db()
    .prepare(
      `insert into round_results (round_id, game_id, total, correct, winner, points) values (?, ?, ?, ?, ?, ?)
       on conflict (round_id) do update set total = excluded.total, correct = excluded.correct,
         winner = excluded.winner, points = excluded.points`,
    )
    .run(r.id, g.id, total, correct, winner, winner === 'none' ? 0 : r.points)
}

export type HostAction =
  | 'next'
  | 'openJoin'
  | 'nextRound'
  | 'closeVoting'
  | 'showResults'
  | 'showAnswer'
  | 'showFinal'
  | 'pause'
  | 'undo'
  | 'reset'
  | 'reload'

export function nextStepLabel(id: GameId): string {
  const g = game(id)
  switch (g.phase) {
    case 'lobby':
    case 'answer':
      return nextRound(g) ? 'Show next question' : 'Show final score'
    case 'question':
      return 'Start voting'
    case 'voting':
      return 'Close voting'
    case 'closed':
      return 'Show results'
    case 'results':
      return 'Show answer'
    case 'final':
      return 'Game over'
  }
}

export function act(id: GameId, action: HostAction) {
  switch (action) {
    case 'next':
      return step(id, (g) => {
        switch (g.phase) {
          case 'lobby':
          case 'answer':
            return goToNextRound(g)
          case 'question':
            return { phase: 'voting', voting_ends_at: Date.now() + VOTING_MS }
          case 'voting':
            return { phase: 'closed' }
          case 'closed':
            return { phase: 'results' }
          case 'results':
            recordResult(g)
            return { phase: 'answer' }
          case 'final':
            return null
        }
      })
    case 'openJoin':
      return step(id, (g) => (g.phase === 'lobby' ? null : { phase: 'lobby', voting_ends_at: null }))
    case 'nextRound':
      return step(id, (g) => (g.phase === 'final' ? null : goToNextRound(g)))
    case 'closeVoting':
      return step(id, (g) => (g.phase === 'voting' ? { phase: 'closed' } : null))
    case 'showResults':
      return step(id, (g) => (g.phase === 'voting' || g.phase === 'closed' ? { phase: 'results' } : null))
    case 'showAnswer':
      return step(id, (g) => {
        if (!['voting', 'closed', 'results'].includes(g.phase) || !g.round_id) return null
        recordResult(g)
        return { phase: 'answer' }
      })
    case 'showFinal':
      return step(id, (g) => (g.phase === 'final' ? null : { phase: 'final', voting_ends_at: null }))
    case 'pause':
      return step(id, (g) => ({ paused: g.paused ? 0 : 1 }))
    case 'undo':
      return undo(id)
    case 'reset':
      return reset(id, false)
    case 'reload':
      return reset(id, true)
  }
}

function undo(id: GameId) {
  const row = db().prepare('select id, snapshot from history where game_id = ? order by id desc limit 1').get(id) as
    | { id: number; snapshot: string }
    | undefined
  if (!row) return
  const snap = JSON.parse(row.snapshot) as Snapshot
  db().exec('begin')
  try {
    db().prepare('delete from history where id = ?').run(row.id)
    setGame(id, {
      phase: snap.phase,
      paused: snap.paused,
      round_id: snap.round_id,
      // Back into voting means a fresh timer: the old one has run out.
      voting_ends_at: snap.phase === 'voting' ? Date.now() + VOTING_MS : null,
    })
    db().prepare('delete from round_results where game_id = ?').run(id)
    const insert = db().prepare(
      'insert into round_results (round_id, game_id, total, correct, winner, points) values (?, ?, ?, ?, ?, ?)',
    )
    for (const r of snap.results) insert.run(r.round_id, r.game_id, r.total, r.correct, r.winner, r.points)
    db().exec('commit')
  } catch (err) {
    db().exec('rollback')
    throw err
  }
  syncCloseTimer(id)
  broadcast(id)
}

// Clears votes, joins, results and undo history for one game. With reloadRounds,
// the rounds are also rebuilt from rounds.config.ts (losing host edits and photos).
function reset(id: GameId, reloadRounds: boolean) {
  db().exec('begin')
  try {
    db().prepare('delete from votes where round_id in (select id from rounds where game_id = ?)').run(id)
    for (const table of ['joins', 'round_results', 'history']) db().prepare(`delete from ${table} where game_id = ?`).run(id)
    if (reloadRounds) {
      db().prepare('delete from rounds where game_id = ?').run(id)
      seedRounds(db(), id)
    }
    setGame(id, { phase: 'lobby', paused: 0, round_id: null, voting_ends_at: null })
    db().exec('commit')
  } catch (err) {
    db().exec('rollback')
    throw err
  }
  syncCloseTimer(id)
  broadcast(id)
}

// Voting closes by itself when the timer runs out.
function syncCloseTimer(id: GameId) {
  const timers = hub().closeTimers
  clearTimeout(timers.get(id))
  timers.delete(id)
  const g = game(id)
  if (g.phase !== 'voting' || !g.voting_ends_at) return
  const wait = Math.max(0, g.voting_ends_at + GRACE_MS - Date.now())
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id)
      step(id, (now) => (now.phase === 'voting' && now.voting_ends_at === g.voting_ends_at ? { phase: 'closed' } : null))
    }, wait),
  )
}

// ---- Host: rounds ----------------------------------------------------------

export function hostRounds(id: GameId): HostRound[] {
  const played = new Set(results(id).map((r) => r.round_id))
  return rounds(id).map((r) => ({
    id: r.id,
    position: r.position,
    label: r.label,
    kind: r.kind,
    prompt: r.prompt,
    answer: r.answer,
    note: r.note,
    points: r.points,
    skipped: !!r.skipped,
    final: !!r.final,
    photos: JSON.parse(r.photos),
    played: played.has(r.id),
  }))
}

export function canUndo(id: GameId): boolean {
  return !!db().prepare('select 1 from history where game_id = ? limit 1').get(id)
}

export interface RoundEdit {
  label?: string
  prompt?: string
  answer?: string | null
  note?: string | null
  skipped?: boolean
  points?: number
}

export function editRound(id: GameId, roundId: string, edit: RoundEdit): string | null {
  const r = round(roundId)
  if (!r || r.game_id !== id) return 'No such round.'
  if (edit.answer !== undefined && edit.answer !== null && !choicesFor(r.kind).includes(edit.answer)) return 'That answer does not fit this round.'
  if (edit.prompt !== undefined && !edit.prompt.trim()) return 'The question cannot be empty.'
  if (edit.points !== undefined && ![1, 2, 3].includes(edit.points)) return 'Points must be 1, 2 or 3.'
  const sets: string[] = []
  const args: (string | number | null)[] = []
  if (edit.label !== undefined) sets.push('label = ?'), args.push(edit.label.trim() || r.label)
  if (edit.prompt !== undefined) sets.push('prompt = ?'), args.push(edit.prompt.trim())
  if (edit.answer !== undefined) sets.push('answer = ?'), args.push(edit.answer)
  if (edit.note !== undefined) sets.push('note = ?'), args.push(edit.note?.trim() || null)
  if (edit.skipped !== undefined) sets.push('skipped = ?'), args.push(edit.skipped ? 1 : 0)
  if (edit.points !== undefined) sets.push('points = ?'), args.push(edit.points)
  if (!sets.length) return null
  db()
    .prepare(`update rounds set ${sets.join(', ')} where id = ?`)
    .run(...args, roundId)
  broadcast(id)
  return null
}

export function setPhoto(id: GameId, roundId: string, slot: number, url: string): string | null {
  const r = round(roundId)
  if (!r || r.game_id !== id || r.kind !== 'pick4') return 'No such photo round.'
  if (!(slot >= 0 && slot < 4)) return 'Photo slot must be A to D.'
  const photos: string[] = JSON.parse(r.photos)
  while (photos.length < 4) photos.push('')
  photos[slot] = url
  db().prepare('update rounds set photos = ? where id = ?').run(JSON.stringify(photos), roundId)
  broadcast(id)
  return null
}
