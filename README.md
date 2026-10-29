# kota.codes

Landing page for Kota Codes Meetup #01. Vite + React + TypeScript, prerendered to static HTML for SEO.

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck, client build, SSR build, prerender -> dist/
npm run preview  # serve dist/
```

Deployed on Vercel: `vercel.json` sets the build (`npm run build` -> `dist/`) and cache headers. Every push to `main` deploys to production; other branches get preview URLs.

## Kota vs AI game

The live voting game for the meetup lives in `play/`: a separate Next.js app that runs on the presenting laptop over local wifi. It isn't part of this site's build or deploy. See `play/README.md`.

## Where things live

- `src/content.ts`: all copy and event facts (date, schedule, speakers, FAQ). Edit here; the page, meta tags and structured data follow.
- `src/seo.ts`: JSON-LD (Organization, Event, FAQPage) for Google rich results.
- `index.html`: title, description, canonical, Open Graph and Twitter tags.
- `scripts/prerender.js`: renders each page (`/` and `/register`) to HTML at build time and writes `sitemap.xml`.
- `src/weave.ts`: the Kota Doria weave (logo mark, cloth swatch, woven border), built from the brand board's proportions. The favicon is generated from it at build time.
- `src/illustrations/`: "Kota in pixels" SVGs from the graphics artifact, rendered by `src/components/Pixel.tsx` at whole-number scales.
- `src/photos/`: speaker photos, cropped to 4:5 (the card's shape) at 640×800 WebP, and set on each speaker in `SPEAKERS` in `src/content.ts`. A speaker without a photo shows their initial instead.
- `public/`: `og-image.png` (1200×630 share image; its top-right line spells out the date and venue, so redraw it when they change), `apple-touch-icon.png`, `robots.txt`.

Date and time: `EVENT.start`/`end` and the labels in `src/content.ts` (setting `start` to null hides the countdown and Google's event listing). Venue: `CONFIG.venue` in `src/config.ts`: name and address, `mapsUrl` (the Google Maps share link every "Get directions" button opens) and `coordinates` (`[latitude, longitude]`, which turn on the map in the venue section). The confirmation emails read the same facts from the Sheet's Settings tab.
If the site moves off `https://kota.codes`, update `SITE.url`, `index.html` and `public/robots.txt`.

## Registration form

The form lives on its own page, `/register` (the home page's "Save your seat" buttons link there). It posts each signup to a Google Apps Script web app, which appends a row to a Google Sheet and sends a confirmation email. Front end: `src/components/RegisterForm.tsx`, `src/registration.ts`. Settings: `src/config.ts`. Backend: `apps-script/Code.gs`.

`/register` is prerendered to `dist/register.html` and served without the extension by `cleanUrls` in `vercel.json`. Its title and share text are `REGISTER_PAGE` in `src/content.ts`.

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
5. **Connect the page.** Put the URL in `webAppUrl` in `src/config.ts`, plus `whatsappCommunityUrl` (the WhatsApp community invite link, shown after every signup attempt) and the venue to match the Settings tab. Commit and push; Vercel redeploys. (From a phone, the GitHub site's pencil icon on the file works, or send the URL to Claude.)

**Every change to the script needs a new deployment version**, or the live URL keeps running the old code: Deploy > Manage deployments > pencil icon > Version: New version > Deploy. The URL stays the same. Changes in the Settings tab don't need this.

Emails go out through MailApp from the account that deployed the script. A personal Gmail account can send about 100 a day; past that, signups are still saved, with `No` under Email sent.
