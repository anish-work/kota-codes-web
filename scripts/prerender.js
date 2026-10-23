// Runs after the client and SSR builds: renders <App /> to static HTML and injects it,
// plus JSON-LD, into dist/index.html, then writes sitemap.xml. Crawlers get the full page without JS.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { render, structuredData, SITE } = await import(`${root}dist-ssr/entry-server.js`);

const jsonLd = JSON.stringify(structuredData()).replace(/</g, '\\u003c');
const template = readFileSync(`${root}dist/index.html`, 'utf8');
const html = template
  .replace('<!--app-html-->', render())
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
console.log('prerendered dist/index.html and dist/sitemap.xml');
