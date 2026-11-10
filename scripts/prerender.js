// Runs after the client and SSR builds: renders each page in PAGES (src/content.ts) to static HTML and injects it, plus its
// head tags and JSON-LD, into a copy of dist/index.html (dist/index.html, dist/meetup-01.html, dist/register.html), then
// writes sitemap.xml. Crawlers get the full page without JS.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { render, structuredData, SITE, PAGES, MARK_SIZE, MARK_SVG } = await import(`${root}dist-ssr/entry-server.js`);

// Favicon: the weave mark alone, following the browser's light or dark setting.
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}"><style>` +
  '.t{fill:#111311}.c{fill:#F2EEE5}.k{fill:#2E7A3C}' +
  '@media (prefers-color-scheme:dark){.t{fill:#F2EEE5}.c{fill:#111311}.k{fill:#C8F169}}' +
  `</style>${MARK_SVG}</svg>`;
writeFileSync(`${root}dist/favicon.svg`, favicon);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ROBOTS = 'index, follow, max-image-preview:large';

// Swap index.html's title, description, URLs and robots for the page's own.
function withHead(html, { path, title, description, robots = ROBOTS }) {
  const url = path === '/' ? `${SITE.url}/` : `${SITE.url}${path}`;
  const tags = [
    [/(<title>)[^<]*/, title],
    [/(<meta name="description" content=")[^"]*/, description],
    [/(<meta name="robots" content=")[^"]*/, robots],
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

const template = readFileSync(`${root}dist/index.html`, 'utf8').replace(
  '<!--favicon-->',
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(favicon)}" />`,
);

// "/" -> dist/index.html; "/meetup-01" -> dist/meetup-01.html, served without the extension by cleanUrls in vercel.json.
const written = [];
for (const [page, head] of Object.entries(PAGES)) {
  const jsonLd = JSON.stringify(structuredData(page)).replace(/</g, '\\u003c');
  const file = head.path === '/' ? 'index.html' : `${head.path.slice(1)}.html`;
  writeFileSync(
    `${root}dist/${file}`,
    withHead(template, head)
      .replace('<!--app-html-->', render(page))
      .replace('<!--structured-data-->', `<script type="application/ld+json">${jsonLd}</script>`),
  );
  written.push(`dist/${file}`);
}

// Pages marked noindex (like /register) stay out of the sitemap.
const today = new Date().toISOString().slice(0, 10);
const urls = Object.values(PAGES)
  .filter((p) => !p.robots?.includes('noindex'))
  .map(
    (p) =>
      `  <url><loc>${SITE.url}${p.path}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${p.path === '/' ? '1.0' : '0.8'}</priority></url>`,
  );
writeFileSync(
  `${root}dist/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`,
);

rmSync(`${root}dist-ssr`, { recursive: true, force: true });
console.log(`prerendered ${written.join(', ')}, dist/sitemap.xml and dist/favicon.svg`);
