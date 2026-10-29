// Shapes shared by the server and the browser. Nothing here may hold a secret.

import type { RoundKind } from '@/rounds.config'

export type { RoundKind }
export type GameId = 'live' | 'practice'
export type Phase = 'lobby' | 'question' | 'voting' | 'closed' | 'results' | 'answer' | 'final'
export type Winner = 'kota' | 'ai' | 'none'

export const GAME_IDS: GameId[] = ['live', 'practice']
export const VOTING_MS = 20_000

export function parseGame(value: string | null | undefined): GameId {
  return value === 'practice' ? 'practice' : 'live'
}

export function choicesFor(kind: RoundKind): string[] {
  return kind === 'pick4' ? ['A', 'B', 'C', 'D'] : ['myth', 'fact']
}

// What phones and the big screen get. The answer, note and split are
// filled in only once the game reaches the phase that shows them.
export interface PublicState {
  game: GameId
  version: number
  phase: Phase
  paused: boolean
  serverNow: number
  votingEndsAt: number | null
  joined: number
  votes: number
  score: { kota: number; ai: number }
  round: null | {
    id: string
    label: string
    kind: RoundKind
    prompt: string
    photos: string[]
    points: number
    final: boolean
  }
  tally: Record<string, number> | null
  answer: string | null
  note: string | null
  winner: Winner | null
  result: null | 'kota' | 'ai' | 'draw'
}

// The host also sees answers and every round.
export interface HostRound {
  id: string
  position: number
  label: string
  kind: RoundKind
  prompt: string
  answer: string | null
  note: string | null
  points: number
  skipped: boolean
  final: boolean
  photos: string[]
  played: boolean
}

export interface HostView {
  rounds: HostRound[]
  joinUrl: string
  wifi: { ssid: string; password: string } | null
  canUndo: boolean
  nextStep: string
}
