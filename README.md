# kota.codes

Landing page for Kota Codes Meetup #01. Vite + React + TypeScript, prerendered to static HTML for SEO.

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck, client build, SSR build, prerender -> dist/
npm run preview  # serve dist/
```

Deployed on Vercel: `vercel.json` sets the build (`npm run build` -> `dist/`) and cache headers. Every push to `main` deploys to production; other branches get preview URLs.

## Where things live

- `src/content.ts`: all copy and event facts (date, schedule, speakers, FAQ). Edit here; the page, meta tags and structured data follow.
- `src/seo.ts`: JSON-LD (Organization, Event, FAQPage) for Google rich results.
- `index.html`: title, description, canonical, Open Graph and Twitter tags.
- `scripts/prerender.js`: renders the app to HTML at build time and writes `sitemap.xml`.
- `public/`: favicon, `og-image.png` (1200×630 share image), `robots.txt`.

When the venue is announced, set `EVENT.venue` in `src/content.ts`.
If the site moves off `https://kota.codes`, update `SITE.url`, `index.html` and `public/robots.txt`.

## Registration form

The form in the save-your-seat section posts each signup to a Google Apps Script web app, which appends a row to a Google Sheet and sends a confirmation email. Front end: `src/components/RegisterForm.tsx`, `src/registration.ts`. Settings: `src/config.ts`. Backend: `apps-script/Code.gs`.

Setup:

1. **Create the Sheet.** New Google Sheet, rename the first tab to `Registrations`, and put these headers in row 1:
   `Timestamp | Status | Full name | WhatsApp | Email | Describes you | College/school/workplace | AI experience | Laptop | Wants to learn | Heard from | Parent permission | Photo consent`
   (If you skip this, the script creates the tab and headers on the first signup.)
2. **Add the script.** In the Sheet: Extensions > Apps Script. Replace everything in `Code.gs` with `apps-script/Code.gs` from this repo. Fill in `EVENT.whatsappGroupUrl` (and the venue once you know it). Save.
3. **Set `MAX_SEATS`** at the top of the script. Signups past that number are saved with status `waitlist` and get the waitlist email.
4. **Deploy.** Deploy > New deployment > type: Web app. Execute as: **Me**. Who has access: **Anyone**. Authorise when asked (Google warns the app is unverified because it's yours: Advanced > Go to project). Copy the web app URL ending in `/exec`, and open it in a browser: you should see `{"ok":true,"status":"ready",...}`.
5. **Connect the page.** Paste the URL into `webAppUrl` in `src/config.ts`, along with `whatsappGroupUrl` and the venue. Commit and push; Vercel redeploys.

**Every change to the script needs a new deployment version**, or the live URL keeps running the old code: Deploy > Manage deployments > pencil icon > Version: New version > Deploy. The URL stays the same.

Emails go out through MailApp from the account that deployed the script. A personal Gmail account can send about 100 a day; past that, signups are still saved but no email is sent that day.
