// Runs after the client and SSR builds: renders <App /> to static HTML and injects it,
// plus JSON-LD, into dist/index.html, then writes sitemap.xml. Crawlers get the full page without JS.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { render, structuredData, SITE, MARK_SIZE, MARK_SVG } = await import(`${root}dist-ssr/entry-server.js`);

// Favicon: the weave mark alone, following the browser's light or dark setting.
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}"><style>` +
  '.t{fill:#111311}.c{fill:#F2EEE5}.k{fill:#2E7A3C}' +
  '@media (prefers-color-scheme:dark){.t{fill:#F2EEE5}.c{fill:#111311}.k{fill:#C8F169}}' +
  `</style>${MARK_SVG}</svg>`;
writeFileSync(`${root}dist/favicon.svg`, favicon);

const jsonLd = JSON.stringify(structuredData()).replace(/</g, '\\u003c');
const template = readFileSync(`${root}dist/index.html`, 'utf8');
const html = template
  .replace('<!--app-html-->', render())
  .replace('<!--favicon-->', `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(favicon)}" />`)
  .replace('<!--structured-data-->', `<script type="application/ld+json">${jsonLd}</script>`);
writeFileSync(`${root}dist/index.html`, html);

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  `${root}dist/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE.url}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`,
);

rmSync(`${root}dist-ssr`, { recursive: true, force: true });
console.log('prerendered dist/index.html, dist/sitemap.xml and dist/favicon.svg');
