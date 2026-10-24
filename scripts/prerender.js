// Runs after the client and SSR builds: renders each page to static HTML and injects it, plus JSON-LD,
// into a copy of dist/index.html (dist/index.html, dist/register.html), then writes sitemap.xml. Crawlers get the full page without JS.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { render, structuredData, SITE, REGISTER_PAGE, MARK_SIZE, MARK_SVG } = await import(`${root}dist-ssr/entry-server.js`);

// Favicon: the weave mark alone, following the browser's light or dark setting.
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}"><style>` +
  '.t{fill:#111311}.c{fill:#F2EEE5}.k{fill:#2E7A3C}' +
  '@media (prefers-color-scheme:dark){.t{fill:#F2EEE5}.c{fill:#111311}.k{fill:#C8F169}}' +
  `</style>${MARK_SVG}</svg>`;
writeFileSync(`${root}dist/favicon.svg`, favicon);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Swap index.html's title, description and URLs for another page's.
function withHead(html, { path, title, description }) {
  const url = `${SITE.url}${path}`;
  const tags = [
    [/(<title>)[^<]*/, title],
    [/(<meta name="description" content=")[^"]*/, description],
    [/(<link rel="canonical" href=")[^"]*/, url],
    [/(<meta property="og:url" content=")[^"]*/, url],
    [/(<meta property="og:title" content=")[^"]*/, title],
    [/(<meta property="og:description" content=")[^"]*/, description],
    [/(<meta name="twitter:title" content=")[^"]*/, title],
    [/(<meta name="twitter:description" content=")[^"]*/, description],
  ];
  return tags.reduce((h, [re, value]) => {
    if (!re.test(h)) throw new Error(`prerender: ${re} not found in index.html`);
    return h.replace(re, (_, start) => start + esc(value));
  }, html);
}

const jsonLd = JSON.stringify(structuredData()).replace(/</g, '\\u003c');
const template = readFileSync(`${root}dist/index.html`, 'utf8').replace(
  '<!--favicon-->',
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(favicon)}" />`,
);

writeFileSync(
  `${root}dist/index.html`,
  template
    .replace('<!--app-html-->', render('home'))
    .replace('<!--structured-data-->', `<script type="application/ld+json">${jsonLd}</script>`),
);

// Served at /register by cleanUrls in vercel.json.
// The Event and FAQ data stay on the home page only: Google wants FAQ markup on the page that shows the FAQ.
writeFileSync(
  `${root}dist${REGISTER_PAGE.path}.html`,
  withHead(template, REGISTER_PAGE).replace('<!--app-html-->', render('register')).replace('<!--structured-data-->', ''),
);

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  `${root}dist/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE.url}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE.url}${REGISTER_PAGE.path}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>
`,
);

rmSync(`${root}dist-ssr`, { recursive: true, force: true });
console.log('prerendered dist/index.html, dist/register.html, dist/sitemap.xml and dist/favicon.svg');
