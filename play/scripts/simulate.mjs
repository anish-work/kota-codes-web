// Simulates a room of phones playing one round, and checks the rules hold.
//
//   npm run simulate                       80 phones, practice game, localhost
//   npm run simulate -- --phones 200       more phones
//   npm run simulate -- --url http://192.168.1.10:3000/play
//
// It logs in as host (HOST_PIN from .env.local), RESETS THE PRACTICE GAME, opens a
// live stream per phone, joins, votes all at once, changes some votes, then steps
// through results, answer and undo. Run it against the practice game only.

import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const PHONES = Number(args.phones ?? 80)
const BASE = (args.url ?? 'http://localhost:3000/play').replace(/\/$/, '')
const GAME = 'practice'
const PIN = args.pin ?? process.env.HOST_PIN ?? readPin()

function readPin() {
  try {
    return readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^HOST_PIN=(.*)$/m)?.[1]?.trim()
  } catch {
    return undefined
  }
}

let failures = 0
const check = (ok, text) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${text}`)
  if (!ok) failures++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pct = (list, p) => list.slice().sort((a, b) => a - b)[Math.min(list.length - 1, Math.floor((p / 100) * list.length))]

async function post(path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: cookie ? { cookie } : {},
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers }
}

// A phone's live stream: keeps the newest state, and notes any secret it should not see.
function openStream(phone) {
  const ctrl = new AbortController()
  phone.close = () => ctrl.abort()
  ;(async () => {
    const res = await fetch(`${BASE}/api/stream?g=${GAME}`, { signal: ctrl.signal })
    const decoder = new TextDecoder()
    let buf = ''
    for await (const chunk of res.body) {
      buf += decoder.decode(chunk, { stream: true })
      let i
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i)
        buf = buf.slice(i + 2)
        const data = block.split('\n').find((l) => l.startsWith('data: '))
        if (!data || block.includes('event: ping')) continue
        const s = JSON.parse(data.slice(6))
        if (!phone.state || s.version >= phone.state.version) phone.state = s
        if (s.phase !== 'answer' && (s.answer !== null || s.note !== null)) phone.leaks.push(`answer in ${s.phase}`)
        if (!['results', 'answer'].includes(s.phase) && s.tally !== null) phone.leaks.push(`split in ${s.phase}`)
      }
    }
  })().catch(() => {})
}

async function waitAll(phones, test, label, timeout = 10_000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (phones.every((p) => p.state && test(p.state))) {
      const ms = Date.now() - start
      check(true, `${label} on all ${phones.length} phones in ${ms} ms`)
      return ms
    }
    await sleep(20)
  }
  const behind = phones.filter((p) => !p.state || !test(p.state)).length
  check(false, `${label}: ${behind} phones still behind after ${timeout} ms`)
}

async function main() {
  if (!PIN) throw new Error('No host PIN. Set HOST_PIN in .env.local or pass --pin.')
  console.log(`Simulating ${PHONES} phones against ${BASE} (practice game)\n`)

  const login = await post('/api/host/login', { pin: PIN })
  if (login.status !== 200) throw new Error(`Host login failed: ${JSON.stringify(login.data)}`)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const host = (action) => post('/api/host/action', { g: GAME, action }, cookie)

  await host('reset')

  const phones = Array.from({ length: PHONES }, () => ({ id: randomBytes(16).toString('hex'), state: null, leaks: [] }))
  phones.forEach(openStream)
  await waitAll(phones, (s) => s.phase === 'lobby', 'Streams connected')

  await Promise.all(phones.map((p) => post('/api/join', { g: GAME, d: p.id })))
  await waitAll(phones, (s) => s.joined === PHONES, `Join count reached ${PHONES}`)

  await host('next') // question
  await waitAll(phones, (s) => s.phase === 'question', 'Question shown')
  const round = phones[0].state.round
  check(round?.kind === 'myth_fact', `First practice round is MYTH/FACT: "${round?.prompt}"`)

  const early = await post('/api/vote', { g: GAME, d: phones[0].id, round: round.id, choice: 'fact' })
  check(early.status === 409, 'Vote before voting opens is refused')

  await host('next') // voting
  await waitAll(phones, (s) => s.phase === 'voting', 'Voting open')

  // Everyone votes at the same moment; about 70% pick FACT.
  const final = new Map()
  const latencies = []
  const vote = async (p, choice) => {
    const t = performance.now()
    const r = await post('/api/vote', { g: GAME, d: p.id, round: round.id, choice })
    latencies.push(performance.now() - t)
    if (r.status === 200) final.set(p.id, choice)
    return r.status
  }
  const t0 = Date.now()
  const statuses = await Promise.all(phones.map((p, i) => vote(p, i % 10 < 7 ? 'fact' : 'myth')))
  check(
    statuses.every((s) => s === 200),
    `${PHONES} votes at once accepted in ${Date.now() - t0} ms (p50 ${pct(latencies, 50).toFixed(0)} ms, p95 ${pct(latencies, 95).toFixed(0)} ms)`,
  )

  // A quarter change their mind; each phone also re-sends once (double tap).
  await Promise.all(phones.slice(0, Math.floor(PHONES / 4)).map((p) => vote(p, final.get(p.id) === 'fact' ? 'myth' : 'fact')))
  await Promise.all(phones.slice(0, 10).map((p) => vote(p, final.get(p.id))))
  await waitAll(phones, (s) => s.votes === PHONES, `Vote count shows ${PHONES} (changes and repeats not double counted)`)

  const bad = await post('/api/vote', { g: GAME, d: phones[0].id, round: round.id, choice: 'A' })
  check(bad.status === 409 || bad.status === 400, 'A choice that does not fit the round is refused')
  const fake = await post('/api/vote', { g: GAME, d: 'not-a-device', round: round.id, choice: 'fact' })
  check(fake.status === 400, 'A malformed device id is refused')
  const hostNoPin = await post('/api/host/action', { g: GAME, action: 'next' })
  check(hostNoPin.status === 401, 'Host actions without the PIN cookie are refused')

  await host('next') // closed
  await waitAll(phones, (s) => s.phase === 'closed', 'Voting closed')
  const late = await post('/api/vote', { g: GAME, d: phones[1].id, round: round.id, choice: 'myth' })
  check(late.status === 409, 'Vote after closing is refused')

  await host('next') // results
  await waitAll(phones, (s) => s.phase === 'results', 'Results shown')
  const expected = { myth: 0, fact: 0 }
  for (const c of final.values()) expected[c]++
  const tally = phones[0].state.tally
  check(tally?.myth === expected.myth && tally?.fact === expected.fact, `Tally MYTH ${tally?.myth} / FACT ${tally?.fact} matches what was sent (${expected.myth} / ${expected.fact})`)
  check(phones[0].state.answer === null, 'Answer still hidden during results')

  await host('next') // answer
  await waitAll(phones, (s) => s.phase === 'answer', 'Answer shown')
  const s = phones[0].state
  const winner = expected.fact * 2 > PHONES ? 'kota' : 'ai'
  check(s.answer === 'fact' && s.winner === winner, `Answer FACT, ${winner === 'kota' ? 'Kota' : 'AI'} scores (${expected.fact}/${PHONES} right)`)
  check(s.score[winner] === 1, `Score is Kota ${s.score.kota} · AI ${s.score.ai}`)

  await host('undo')
  await waitAll(phones, (x) => x.phase === 'results' && x.score.kota + x.score.ai === 0, 'Undo goes back to results and takes the point back')
  await host('next')
  await waitAll(phones, (x) => x.phase === 'answer' && x.score[winner] === 1, 'Showing the answer again gives the point once')

  const leaks = phones.flatMap((p) => p.leaks)
  check(leaks.length === 0, leaks.length ? `Secrets reached phones early: ${[...new Set(leaks)].join(', ')}` : 'No phone saw the answer or the split before it was shown')

  phones.forEach((p) => p.close())
  await host('reset')
  console.log(`\n${failures ? `${failures} check(s) failed.` : 'All checks passed.'} Practice game reset.`)
  process.exit(failures ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
