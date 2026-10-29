// Plays the practice game in a real browser and takes screenshots of every
// step: the big screen at 1920x1080 and two phones at 360px wide. Also checks
// that the phone page never scrolls sideways.
//
//   node scripts/screens.mjs --out ./shots [--url http://localhost:3000/play]
//
// Needs Playwright with Chromium. RESETS THE PRACTICE GAME.

import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const BASE = (args.url ?? 'http://localhost:3000/play').replace(/\/$/, '')
const OUT = args.out ?? './shots'
const PIN = args.pin ?? process.env.HOST_PIN ?? readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^HOST_PIN=(.*)$/m)?.[1]?.trim()
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const screenCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
const phones = {
  android: await browser.newContext({ ...devices['Pixel 5'], viewport: { width: 360, height: 760 } }),
  iphone: await browser.newContext({ ...devices['iPhone 12'], viewport: { width: 360, height: 700 } }),
}

const login = await screenCtx.request.post(`${BASE}/api/host/login`, { data: { pin: PIN } })
if (!login.ok()) throw new Error('Host login failed')
const host = (action) => screenCtx.request.post(`${BASE}/api/host/action`, { data: { g: 'practice', action } })
await host('reset')

const screen = await screenCtx.newPage()
await screen.goto(`${BASE}/screen?g=practice`)
const phonePages = {}
for (const [name, ctx] of Object.entries(phones)) {
  phonePages[name] = await ctx.newPage()
  await phonePages[name].goto(`${BASE}?g=practice`)
}

let problems = 0
async function shoot(step) {
  await screen.waitForTimeout(700)
  await screen.screenshot({ path: `${OUT}/${step}-screen.png` })
  for (const [name, page] of Object.entries(phonePages)) {
    await page.screenshot({ path: `${OUT}/${step}-${name}.png`, fullPage: true })
    const wide = await page.evaluate(() => document.documentElement.scrollWidth)
    if (wide > 360) {
      problems++
      console.log(`FAIL  ${step}: ${name} page is ${wide}px wide`)
    }
  }
  console.log(`shot  ${step}`)
}

const tap = async (label) => {
  for (const page of Object.values(phonePages)) await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
}

await shoot('01-lobby')
await host('next')
await shoot('02-question')
await host('next')
await tap('FACT')
await shoot('03-voting')
await host('next')
await shoot('04-closed')
await host('next')
await shoot('05-results')
await host('next')
await shoot('06-answer')
await host('next') // photo round
await host('next')
await tap('C')
await shoot('07-photo-voting')
await host('next')
await host('next')
await shoot('08-photo-results')
await host('next')
await shoot('09-photo-answer')
await host('next') // fish
await host('next')
await tap('FACT') // wrong on purpose
await host('showAnswer')
await shoot('10-wrong-answer')
await host('next') // chai, opinion
await host('next')
await tap('MYTH')
await host('next')
await host('next')
await host('next')
await shoot('11-opinion-answer')
await host('pause')
await shoot('12-paused')
await host('pause')
await host('showFinal')
await shoot('13-final')

await host('reset')
await browser.close()
console.log(problems ? `${problems} problem(s).` : `Done. Screenshots in ${OUT}`)
process.exit(problems ? 1 : 0)
