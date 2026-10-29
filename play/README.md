# Kota vs AI

The "AI: myth or fact?" game for Kota Codes Meetup 01. It runs on the presenting laptop over your own wifi router; no internet or cloud accounts are needed.

- `/play/screen` is the big screen (1920×1080, fullscreen).
- `/play` is the phone page (from the QR code).
- `/play/host` is the host remote (PIN).

Add `?g=practice` to any of them for the practice game, which has its own questions, votes and score.

## Setup (do this the day before)

Needs Node 22.13 or newer.

```bash
cd play
```

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`: `HOST_PIN`, and `WIFI_SSID` / `WIFI_PASSWORD` for your router. Then:

```bash
npm run build
```

```bash
npm start
```

The server prints an "ExperimentalWarning: SQLite" line. That is normal.

## On the day

1. **Router.** Plug in your router. If you can, give it internet (phone hotspot, SIM, or the venue's cable). The game doesn't need it, but some Android phones leave a wifi that has no internet and then can't open the page.
2. **Laptop.** Join the router's wifi. Turn off sleep and keep the laptop plugged in. In the router's settings, give the laptop a fixed IP (often called "DHCP reservation") so the QR code stays right.
3. **Start.** Run `npm start` in `play/`.
4. **Host.** On your phone (on the same wifi), open the address shown under "Phones open" on the host page, change the end to `/host`, and enter the PIN. Also log in once at `/play/host` on the laptop: the big screen's keys only work after that.
5. **Big screen.** Open `/play/screen` on the laptop and press F for fullscreen.
6. **Test.** Scan both QR codes with one Android phone and one iPhone. Run a practice round (`?g=practice` on all three pages), then press Reset game in practice.

If the laptop's address is found wrongly (for example, a VPN is on), set `PUBLIC_URL=http://<laptop-ip>:3000/play` in `.env.local` and restart.

## Running the game

| Key / button | Does |
|---|---|
| Space, or **Next step** | join → question → start 20s voting → close → results → answer → next question … → final |
| P, or **Pause** | plain screen (score and QR stay); press again to come back to the same place |
| Z, or **Undo last step** | goes back one step; undoing a shown answer takes its points back |
| F | fullscreen on the big screen |
| **Next round** | jumps to the next question (skipping what's left of this one) |
| **Final round x3** | triple points for the final round (until its answer is shown) |
| **Skip this round** | in the round list; e.g. round 3 if you run late |
| **Reset game** | tap twice; clears votes, joins and score for this game only |

Voting also closes by itself when the 20 seconds run out.

**Score.** If more than half the votes in a round are right, Kota gets the points. Otherwise AI does. A round with no votes, and the opinion round, gives no points.

## Questions and photos

The questions are in `rounds.config.ts`. You can also edit the text and answers on the host page; those edits are saved. **Reload rounds from file** re-reads the config, but it clears votes, scores, edits and uploaded photos.

For the photo round, open it in the host page's round list, upload four photos (A–D), and pick the real one as the right answer. Photos are shrunk before upload and saved under random names, so the file name can't give the answer away.

## How it works

- Next.js (App Router), TypeScript and Tailwind. Fonts ship with the app.
- SQLite (`node:sqlite`) in `data/game.db`. Every step is saved, so a crash or restart carries on where it was, timer included. Delete `data/` to start completely fresh.
- One vote per phone per round is enforced by the database's primary key `(round_id, device_id)`. Voting again changes that phone's vote.
- Phones get live updates over Server-Sent Events. If the stream drops (phone locked, wifi blip), they poll quietly and reconnect. A vote that fails to send is retried until voting closes.
- Phones only ever see a public state. The answer and the split are added only when the big screen shows them. Answers load on the host page only after the PIN.
- Each phone gets a random id in localStorage. No names or personal data are collected.

## Checks

With the server running (`npm start`), these reset the **practice** game:

```bash
npm run simulate -- --phones 80
```

This simulates phones joining and all voting at once, changing votes and voting twice. It checks the counts, the tally, scoring, undo, refusing late or invalid votes and host actions without the PIN, and that no phone sees the answer early. Last run: 80 phones passed (all votes in about 0.3s), and 300 phones passed (about 0.6s).

```bash
node scripts/screens.mjs --out ./shots
```

This plays the practice game in Chromium and screenshots every step: the big screen at 1920×1080, and phones at 360px wide with Android and iPhone settings. It fails if the phone page scrolls sideways. It runs Chrome's engine only, so check a real iPhone in Safari on the day.
