// The questions for each game. Edit here before the event, then press
// "Reload rounds from this file" on the host page (or delete data/game.db).
// You can also edit the text and answers on the host page itself.
//
// kind:
//   'myth_fact'  MYTH / FACT buttons. answer is 'myth' or 'fact'.
//   'pick4'      A / B / C / D buttons over four photos. answer is 'A'..'D'.
//                Upload the photos on the host page.
//   'opinion'    MYTH / FACT buttons, no right answer, no points. note is shown after.
// final: true marks the last round; the host can switch it to triple points.

export type RoundKind = 'myth_fact' | 'pick4' | 'opinion'

export interface RoundConfig {
  key: string
  label: string
  kind: RoundKind
  prompt: string
  answer: string | null
  note?: string
  final?: boolean
  photos?: string[]
}

export const GAMES: Record<'live' | 'practice', RoundConfig[]> = {
  live: [
    { key: 'voice', label: 'Round 1', kind: 'myth_fact', prompt: 'AI can copy your voice from a short recording.', answer: 'fact' },
    { key: 'photo', label: 'Round 2', kind: 'myth_fact', prompt: 'AI can make a photo of Kota that looks completely real.', answer: 'fact' },
    { key: 'photo-pick', label: 'Round 2: photos', kind: 'pick4', prompt: 'Only one of these photos is real. Which one?', answer: null },
    { key: 'always-right', label: 'Round 3', kind: 'myth_fact', prompt: 'AI is always right.', answer: 'myth' },
    { key: 'build-app', label: 'Round 4', kind: 'myth_fact', prompt: 'Someone who has never coded can build an app in two minutes.', answer: 'fact' },
    { key: 'jobs', label: 'Round 5', kind: 'opinion', prompt: 'AI will take your job.', answer: null, note: 'Honest answer: nobody knows yet.' },
    { key: 'kachori', label: 'Final round', kind: 'myth_fact', prompt: 'AI can make a real Kota kachori.', answer: 'myth', final: true },
  ],
  practice: [
    { key: 'p-sun', label: 'Practice 1', kind: 'myth_fact', prompt: 'The sun is a star.', answer: 'fact' },
    {
      key: 'p-pick',
      label: 'Practice 2',
      kind: 'pick4',
      prompt: 'Which box is green?',
      answer: 'C',
      photos: ['/play/practice/a.svg', '/play/practice/b.svg', '/play/practice/c.svg', '/play/practice/d.svg'],
    },
    { key: 'p-fish', label: 'Practice 3', kind: 'myth_fact', prompt: 'Fish can climb trees.', answer: 'myth' },
    { key: 'p-chai', label: 'Practice 4', kind: 'opinion', prompt: 'Chai is better than coffee.', answer: null, note: 'Honest answer: it depends who you ask.' },
    { key: 'p-final', label: 'Practice final', kind: 'myth_fact', prompt: 'Kota is in Rajasthan.', answer: 'fact', final: true },
  ],
}
