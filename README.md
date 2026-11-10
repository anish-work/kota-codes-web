# kota.codes

Home of Kota Codes, Kota’s AI & tech community. Vite + React + TypeScript, prerendered to static HTML for SEO.

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck, client build, SSR build, prerender -> dist/
npm run preview  # serve dist/
```

Deployed on Vercel: `vercel.json` sets the build (`npm run build` -> `dist/`) and cache headers. Every push to `main` deploys to production; other branches get preview URLs.

## Pages

- `/`: the community home page. A status bar, the wordmark, then about/, meetup-01/ (a short recap), whats-next/, who-can-come/ and get-involved/ (follow @kota.codes on Instagram).
- `/meetup-01`: Meetup 01 (Saturday 7 November 2026, iStart Nest, Kota) told after the fact: how-it-went/, photos/ (a grid; any picture opens a full-screen carousel with arrows, swipe, the arrow keys and a thumbnail strip), speakers/ with the two talks, the-day/ and the follow block.
- `/register`: says Meetup 01 registration is closed and points to @kota.codes for Meetup 02. Kept out of search (`noindex`) and out of the sitemap.

`scripts/prerender.js` renders each page to `dist/index.html`, `dist/meetup-01.html` and `dist/register.html`; `cleanUrls` in `vercel.json` serves them without the extension.

## Where things live

- `src/content.ts`: all copy and facts. `SITE` (name, tagline, Instagram), `STATUS` (the black bar), `PAGES` (each page's title and description), `MEETUP_01` (date, venue), and every section's text. Edit here; the pages, head tags and structured data follow.
- `src/seo.ts`: JSON-LD: Organization on every page, WebSite on `/`, and the Meetup 01 Event on `/meetup-01`.
- `index.html`: the head tags. Title, description and URLs are replaced per page from `PAGES` at build time.
- `src/weave.ts`: the Kota Doria weave (logo mark, cloth swatch, woven border), built from the brand board's proportions. The favicon is generated from it at build time.
- `src/illustrations/`: "Kota in pixels" SVGs from the graphics artifact, rendered by `src/components/Pixel.tsx` at whole-number scales.
- `src/photos/`: speaker photos, cropped to 4:5 at 640×800 WebP, set on each speaker in `SPEAKERS` in `src/content.ts`.
- `src/photos/meetup-01/`: the Meetup 01 photos and videos for photos/ on `/meetup-01`, listed with their captions in `GALLERY` in `src/content.ts`. Each photo has `<id>-640.webp` (grid) and `<id>-1800.webp` (lightbox, long edge 1800); each video is `<id>.mp4` (720p H.264, HDR tone-mapped to SDR) with a poster in the same two sizes. EXIF and location data are stripped. To add one, make the files the same way and add a line to `GALLERY`; the grid fills 4, 3 or 2 across, so keep the count of tiles (a wide tile counts as two) a multiple of 12 to avoid gaps.
- `public/`: `og-image.png` (1200×630 share image: the woven mark, wordmark and tagline, no date, so it stays right between meetups), `apple-touch-icon.png`, `robots.txt`.

If the site moves off `https://kota.codes`, update `SITE.url`, `index.html` and `public/robots.txt`.

## Next meetup

When Meetup 02 has a date and venue: update `STATUS` and `NEXT` in `src/content.ts`, and the home page description in `PAGES` and `index.html`. A `/meetup-02` page can follow the `/meetup-01` pattern (`src/components/Meetup.tsx`, a `PAGES` entry, a route in `pageFor` in `src/App.tsx`).

## Registration (Meetup 01, closed)

The `/register` chat and its Google Sheet backend were taken off the site after Meetup 01. The front end (the chat, the pass, the countdown and the venue map) is in git history: the last commit with it is `58ece5b`. The Apps Script backend stays in `apps-script/Code.gs`, and the Sheet keeps the Meetup 01 registrations. The notes below describe that setup, for reuse.

Until Meetup 01, `/register` was a chat with the kota.codes bot that asked one thing at a time and printed a pass. Each signup was posted to a Google Apps Script web app, which appended a row to a Google Sheet and sent a confirmation email. Front end (in `58ece5b`): `src/components/RegisterChat.tsx`, `Pass.tsx`, `src/registration.ts`, settings in `src/config.ts`. Backend: `apps-script/Code.gs`.


### The Sheet

- **Registrations**: one row per signup. Headers in row 1:
  `Timestamp | Status | Full name | WhatsApp | Email | Describes you | College/school/workplace | AI experience | Laptop | Wants to learn | Heard from | Parent permission | Photo consent | Email sent`
  Status is `Registered`, `Waitlist`, `Cancelled` or `Attended`. Change it by hand: `Cancelled` frees a seat and lets that person sign up again. `Email sent` is `Yes`, `No` (quota ran out or sending failed, so follow up by hand) or `Off`.
- **Settings**: `Setting | Value` rows, read on every signup, so changes apply straight away with no redeploy. `Registrations open` (`No` makes the form say registrations are closed), `Max seats` (blank means no limit; once full, signups go to the waitlist), `Event date`, `Event time`, `Venue`, `Venue address`, `Map link`, `WhatsApp group link` (registered people only), `What to bring`, `Send confirmation emails`. Missing rows fall back to `DEFAULTS` in the script.
- **Summary** (optional): counts built from formulas over Registrations.

If the Registrations tab is missing, the script creates it with these headers on the first signup.

### Connect it (works from a phone)

The Sheets phone app has no Apps Script menu, so use the phone's browser in desktop mode (Chrome: ⋮ > Desktop site. Safari: aA > Request Desktop Website). Landscape helps.

1. **Open the Sheet** at sheets.google.com in that browser tab, then Extensions > Apps Script.
2. **Paste the script.** In `Code.gs`, select all, delete, and paste `apps-script/Code.gs` from this repo as is. Nothing in it needs editing; settings come from the Settings tab. Tap Save.
3. **Deploy.** Deploy > New deployment > gear icon > Web app. Execute as: **Me**. Who has access: **Anyone**. Deploy, then authorise when asked (Google warns the app is unverified because it's yours: Advanced > Go to project (unsafe) > Allow). Copy the web app URL ending in `/exec`.
4. **Check it.** Open the URL: you should see `{"ok":true,"status":"ready",...}`.
5. **Connect the page.** Put the URL in `webAppUrl` in `src/config.ts` (restored from `58ece5b`), plus `whatsappCommunityUrl` (the WhatsApp community invite link, shown after every signup attempt) and the venue to match the Settings tab. Commit and push; Vercel redeploys. (From a phone, the GitHub site's pencil icon on the file works, or send the URL to Claude.)

**Every change to the script needs a new deployment version**, or the live URL keeps running the old code: Deploy > Manage deployments > pencil icon > Version: New version > Deploy. The URL stays the same. Changes in the Settings tab don't need this.

Emails go out through MailApp from the account that deployed the script. A personal Gmail account can send about 100 a day; past that, signups are still saved, with `No` under Email sent.
