// Builds the static site into _site/: copies the root files, renders blog/*.md
// into /blog/<slug>/index.html, and regenerates sitemap.xml.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const SITE = 'https://voltcheck.hu';
const NOT_PUBLISHED = new Set(['.git', '.github', '.gitignore', '.DS_Store', '_site', 'node_modules',
  'blog', 'scripts', 'package.json', 'package-lock.json', 'sitemap.xml']);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fail = (file, msg) => { throw new Error(`blog/${file}: ${msg}`); };

const indexHtml = await readFile(path.join(ROOT, 'index.html'), 'utf8');
// Reuse the tracking tags from index.html so blog pages stay in sync with the home page.
const analytics = (indexHtml.match(/<script async src="https:\/\/www\.googletagmanager\.com[^>]*><\/script>\s*<script>[\s\S]*?<\/script>/g) || []).join('\n');
if (!analytics) throw new Error('No Google tag snippets found in index.html');

const fmtDate = (d) => new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
const isoDate = (d) => d.toISOString().slice(0, 10);

async function loadPosts() {
  const files = (await readdir(path.join(ROOT, 'blog'))).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');
  const posts = [];
  for (const file of files) {
    let parsed;
    try { parsed = matter(await readFile(path.join(ROOT, 'blog', file), 'utf8')); }
    catch (e) { fail(file, `invalid frontmatter (quote values that contain a colon): ${e.reason || e.message}`); }
    const { data, content } = parsed;
    if (data.draft) continue;
    const slug = file.replace(/\.md$/, '');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(file, 'filename must be lowercase letters, digits and hyphens');
    if (!data.title) fail(file, 'missing "title" in frontmatter');
    if (!data.description) fail(file, 'missing "description" in frontmatter');
    const date = data.date instanceof Date ? data.date : new Date(data.date);
    if (!data.date || Number.isNaN(date.getTime())) fail(file, 'missing or invalid "date" (use YYYY-MM-DD)');
    posts.push({ slug, title: String(data.title), description: String(data.description), date, image: data.image, html: marked.parse(content) });
  }
  return posts.sort((a, b) => b.date - a.date);
}

const absUrl = (u) => (/^https?:\/\//.test(u) ? u : `${SITE}/${String(u).replace(/^\//, '')}`);

function page({ title, description, canonical, image, jsonLd, body }) {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
${analytics}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#0a0a0a">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="${jsonLd ? 'article' : 'website'}">
<meta property="og:site_name" content="VoltCheck">
<meta property="og:locale" content="hu_HU">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/blog.css">
</head>
<body>
<nav>
  <a href="/" class="logo" aria-label="VoltCheck"><span class="logo-dot"></span>VoltCheck</a>
  <ul class="nav-links">
    <li><a href="/#how-it-works">Hogyan működik</a></li>
    <li><a href="/#report">Certifikáció</a></li>
    <li><a href="/#why">Kinek hasznos</a></li>
    <li><a href="/#pricing">Árak</a></li>
    <li><a href="/blog/" aria-current="page">Blog</a></li>
    <li><a href="/#contact">Kapcsolat</a></li>
  </ul>
  <div class="nav-right">
    <a href="/#contact" class="nav-cta">Ajánlatkérés</a>
    <button class="nav-toggle" type="button" aria-label="Menü" aria-controls="mobile-menu" aria-expanded="false">
      <svg class="icon-open" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      <svg class="icon-close" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  </div>
</nav>
<div id="mobile-menu" class="mobile-menu" aria-hidden="true">
  <a href="/#how-it-works">Hogyan működik</a>
  <a href="/#report">Certifikáció</a>
  <a href="/#why">Kinek hasznos</a>
  <a href="/#pricing">Árak</a>
  <a href="/blog/">Blog</a>
  <a href="/#contact">Kapcsolat</a>
  <a href="/#contact" class="mobile-menu-cta">Ajánlatkérés</a>
</div>
<main>
${body}
</main>
<footer>
  <div class="footer-logo"><span class="logo-dot"></span>VoltCheck</div>
  <p>Mobil EV Akkumulátor Diagnosztika · CARA Tanúsított Jelentések</p>
  <a class="footer-contact" href="mailto:info@voltcheck.hu">info@voltcheck.hu</a>
  <p class="footer-copy">© ${new Date().getFullYear()} VoltCheck. Minden jog fenntartva.</p>
</footer>
<script>
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  });
</script>
</body>
</html>
`;
}

function postPage(p) {
  const canonical = `${SITE}/blog/${p.slug}/`;
  const image = p.image ? absUrl(p.image) : `${SITE}/og-image.png`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: isoDate(p.date),
    dateModified: isoDate(p.date),
    image,
    inLanguage: 'hu',
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: 'VoltCheck', url: `${SITE}/` },
    publisher: { '@type': 'Organization', name: 'VoltCheck', url: `${SITE}/` },
  };
  const body = `<article class="post">
  <a class="back" href="/blog/">← Összes bejegyzés</a>
  <h1>${esc(p.title)}</h1>
  <time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time>
  <div class="post-body">
${p.html}
  </div>
</article>`;
  return page({ title: `${p.title} | VoltCheck`, description: p.description, canonical, image, jsonLd, body });
}

function indexPage(posts) {
  const items = posts.map((p) => `    <li>
      <a href="/blog/${p.slug}/">
        <time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time>
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.description)}</p>
      </a>
    </li>`).join('\n');
  const body = `<section class="post-list">
  <h1>Blog</h1>
${posts.length ? `  <ul>\n${items}\n  </ul>` : '  <p>Hamarosan érkeznek az első bejegyzések.</p>'}
</section>`;
  return page({
    title: 'Blog | VoltCheck',
    description: 'Cikkek az elektromos és hibrid autók akkumulátorának állapotáról, diagnosztikáról és használtautó-vásárlásról.',
    canonical: `${SITE}/blog/`,
    image: `${SITE}/og-image.png`,
    body,
  });
}

async function sitemap(posts) {
  const home = (await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8')).match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  const latest = posts[0] ? isoDate(posts[0].date) : home;
  const url = (loc, lastmod) => `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
  const entries = [url(`${SITE}/`, home), url(`${SITE}/blog/`, latest), ...posts.map((p) => url(`${SITE}/blog/${p.slug}/`, isoDate(p.date)))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const name of await readdir(ROOT)) {
  if (!NOT_PUBLISHED.has(name)) await cp(path.join(ROOT, name), path.join(OUT, name), { recursive: true });
}

// Images and other files placed in blog/ next to the posts are published under /blog/.
await cp(path.join(ROOT, 'blog'), path.join(OUT, 'blog'), { recursive: true, filter: (src) => !src.endsWith('.md') });

const posts = await loadPosts();
await mkdir(path.join(OUT, 'blog'), { recursive: true });
await writeFile(path.join(OUT, 'blog', 'index.html'), indexPage(posts));
for (const p of posts) {
  await mkdir(path.join(OUT, 'blog', p.slug), { recursive: true });
  await writeFile(path.join(OUT, 'blog', p.slug, 'index.html'), postPage(p));
}
await writeFile(path.join(OUT, 'sitemap.xml'), await sitemap(posts));
console.log(`Built ${posts.length} post(s) into _site/`);
