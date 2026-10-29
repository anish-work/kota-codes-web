import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { GAMES } from '@/rounds.config'
import { GAME_IDS, type GameId } from './types'

// One SQLite file on the laptop holds the whole game, so a crash or restart
// picks up exactly where it was. Delete data/game.db to start from scratch.
export const DATA_DIR = path.join(process.cwd(), 'data')
export const PHOTO_DIR = path.join(DATA_DIR, 'photos')

const SCHEMA = `
create table if not exists games (
  id             text primary key,
  phase          text not null default 'lobby',
  paused         integer not null default 0,
  round_id       text,
  voting_ends_at integer,
  version        integer not null default 0
);
create table if not exists rounds (
  id       text primary key,
  game_id  text not null references games(id) on delete cascade,
  position real not null,
  label    text not null,
  kind     text not null check (kind in ('myth_fact', 'pick4', 'opinion')),
  prompt   text not null,
  answer   text,
  note     text,
  points   integer not null default 1,
  skipped  integer not null default 0,
  final    integer not null default 0,
  photos   text not null default '[]'
);
create table if not exists joins (
  game_id   text not null references games(id) on delete cascade,
  device_id text not null,
  joined_at integer not null,
  primary key (game_id, device_id)
);
create table if not exists votes (
  round_id   text not null references rounds(id) on delete cascade,
  device_id  text not null,
  choice     text not null check (choice in ('myth', 'fact', 'A', 'B', 'C', 'D')),
  updated_at integer not null,
  primary key (round_id, device_id)
);
create table if not exists round_results (
  round_id text primary key references rounds(id) on delete cascade,
  game_id  text not null references games(id) on delete cascade,
  total    integer not null,
  correct  integer not null,
  winner   text not null check (winner in ('kota', 'ai', 'none')),
  points   integer not null
);
create table if not exists history (
  id         integer primary key autoincrement,
  game_id    text not null references games(id) on delete cascade,
  snapshot   text not null,
  created_at integer not null
);
`

export function openDb(): DatabaseSync {
  mkdirSync(PHOTO_DIR, { recursive: true })
  const db = new DatabaseSync(path.join(DATA_DIR, 'game.db'))
  db.exec('pragma journal_mode = wal; pragma synchronous = normal; pragma foreign_keys = on;')
  db.exec(SCHEMA)
  for (const id of GAME_IDS) {
    const exists = db.prepare('select 1 from games where id = ?').get(id)
    if (!exists) {
      db.prepare('insert into games (id) values (?)').run(id)
      seedRounds(db, id)
    }
  }
  return db
}

export function seedRounds(db: DatabaseSync, game: GameId) {
  const insert = db.prepare(`insert into rounds
    (id, game_id, position, label, kind, prompt, answer, note, points, final, photos)
    values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
  GAMES[game].forEach((r, i) => {
    insert.run(`${game}:${r.key}`, game, i + 1, r.label, r.kind, r.prompt, r.answer, r.note ?? null, r.final ? 1 : 0, JSON.stringify(r.photos ?? []))
  })
}
