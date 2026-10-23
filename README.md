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
