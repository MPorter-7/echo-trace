// scripts/prerender.mjs
//
// Runs after `vite build`. Starts a local static server for the built
// `dist/` folder, visits each public route in a headless browser, waits
// for React to render, then saves the fully-rendered HTML back into
// `dist/<route>/index.html`. Auth-gated dashboard routes are intentionally
// excluded — only public marketing/legal pages are prerendered.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const DIST_DIR = path.resolve('dist');
const PORT = 4173;

// Public routes worth prerendering for search engines and AI crawlers.
// Add more paths here later if you add more public marketing/legal pages.
const ROUTES = ['/', '/privacy', '/terms'];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startStaticServer() {
  const server = createServer(async (req, res) => {
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    if (!existsSync(filePath) || filePath.endsWith('/')) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    try {
      const data = await readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function prerenderRoute(browser, route, attempt = 1) {
  const maxAttempts = 3;
  const page = await browser.newPage();
  try {
    const url = `http://localhost:${PORT}${route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Wait until React has actually rendered content into #root,
    // rather than waiting for the network to go fully idle (which
    // never happens here due to a persistent Supabase connection).
    await page.waitForFunction(
      () => document.getElementById('root')?.children.length > 0,
      { timeout: 30000 }
    );

    // Small buffer for any final paint/layout.
    await new Promise((r) => setTimeout(r, 500));

    let html = await page.content();
    await page.close();

    // The canonical/OG URL in the template is hardcoded to the homepage.
    // Swap it for this route's actual URL so each page doesn't look
    // like a duplicate of the homepage to search engines.
    const routeUrl = route === '/' ? 'https://www.echo-trace.com/' : `https://www.echo-trace.com${route}/`;
    html = html.replaceAll('https://www.echo-trace.com/', routeUrl);

    return html;
  } catch (err) {
    await page.close().catch(() => {});
    if (attempt < maxAttempts) {
      console.log(`  ... retrying ${route} (attempt ${attempt + 1}/${maxAttempts})`);
      return prerenderRoute(browser, route, attempt + 1);
    }
    throw err;
  }
}

async function prerenderRouteAndSave(browser, route) {
  const html = await prerenderRoute(browser, route);

  const outDir = route === '/' ? DIST_DIR : path.join(DIST_DIR, route);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), html, 'utf-8');
  console.log(`  ✓ prerendered ${route} -> ${path.relative(process.cwd(), outDir)}/index.html`);
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    console.error('dist/ not found — run `vite build` before prerendering.');
    process.exit(1);
  }

  console.log('Prerendering public routes...');
  const server = await startStaticServer();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  try {
    for (const route of ROUTES) {
      await prerenderRouteAndSave(browser, route);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Prerendering failed:', err);
  process.exit(1);
});
