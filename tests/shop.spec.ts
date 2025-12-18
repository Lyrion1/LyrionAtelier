import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { pathToFileURL } from 'url';

const PORT = 4173;
const ROOT = path.resolve(__dirname, '..');
const PLACEHOLDER_NOTICE = /Catalog is updating/i;
const MIN_VISIBLE_PRODUCTS = 8; // shop grid should show at least eight items when catalog data is available

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function startServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url || '/', true);
      let pathname = parsed.pathname || '/';

      if (pathname === '/') pathname = '/index.html';
      if (pathname === '/shop') pathname = '/shop.html';

      if (pathname.startsWith('/netlify/functions/printful-sync')) {
        try {
          const fn = await import(pathToFileURL(path.join(ROOT, 'netlify/functions/printful-sync.js')).href);
          const result = await fn.handler({ queryStringParameters: parsed.query || {} });
          res.statusCode = result.statusCode || 200;
          Object.entries(result.headers || {}).forEach(([key, value]) => res.setHeader(key, value as string));
          res.end(result.body || '');
          return;
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
          return;
        }
      }

      const filePath = path.join(ROOT, pathname.replace(/^\//, ''));
      if (!filePath.startsWith(ROOT)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
        res.end(data);
      });
    });

    server.listen(PORT, () => resolve(server));
  });
}

test.describe('shop smoke test', () => {
  let server: http.Server;

  test.beforeAll(async () => {
    server = await startServer();
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('shows products or updating notice without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );

    await page.goto(`http://localhost:${PORT}/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.product-card, .shop-empty-note', { timeout: 5000 });

    const cards = page.locator('.product-card');
    const notice = page.locator('text=Catalog is updating');

    const cardCount = await cards.count();
    if (cardCount > 0) {
      await page.waitForFunction(
        () => document.querySelectorAll('.product-card img[src]').length >= 6,
        { timeout: 5000 }
      );
      expect(cardCount).toBeGreaterThanOrEqual(MIN_VISIBLE_PRODUCTS);
      await cards.first().scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (selector) =>
          Array.from(document.querySelectorAll(selector)).some((img) => (img as HTMLImageElement).naturalWidth > 0),
        '.product-card img',
        { timeout: 5000 }
      );
      const widths = await cards.locator('img').evaluateAll((imgs) =>
        imgs.map((img) => (img as HTMLImageElement).naturalWidth)
      );
      const srcs = await cards.locator('img').evaluateAll((imgs) =>
        imgs.map((img) => (img as HTMLImageElement).getAttribute('src') || '')
      );
      expect(Math.max(...widths)).toBeGreaterThan(50);
      expect(srcs.every((src) => src && src !== 'Image loading…')).toBeTruthy();
    } else {
      await expect(notice).toBeVisible();
      const noticeText = await notice.textContent();
      expect(noticeText || '').toMatch(PLACEHOLDER_NOTICE);
    }

    expect(consoleErrors).toEqual([]);
    await page.screenshot({ path: 'shop-pass.png', fullPage: true });
  });
});
