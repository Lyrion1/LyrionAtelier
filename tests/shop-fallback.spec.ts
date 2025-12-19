import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { pathToFileURL } from 'url';

type CatalogWindow = Window & { LyrionAtelier?: any; mountGrid?: (list: any[]) => void };

const PORT = 4174;
const ROOT = path.resolve(__dirname, '..');
const MOCK_IMAGE = `http://localhost:${PORT}/assets/catalog/placeholder.webp`;

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
      if (/^\/shop\/[^/]+/.test(pathname)) pathname = '/product.html';

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

const SAMPLE_PRODUCTS = [
  {
    id: 'with-image',
    slug: 'with-image',
    title: 'Has Image',
    price: 25,
    image: MOCK_IMAGE,
    images: [MOCK_IMAGE],
    variants: [{ id: 'with-image-variant', price: 25, inStock: true }]
  },
  {
    id: 'zodiac-only',
    slug: 'zodiac-only',
    title: 'Aries Fallback',
    price: 19,
    zodiac: 'aries',
    variants: [{ id: 'aries-variant', price: 19, inStock: true }]
  }
] as const;

test.describe('shop fallback art', () => {
  let server: http.Server;

  test.beforeAll(async () => {
    server = await startServer();
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('provides images and actions even when art is missing', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );
    await page.route('**/js/products.js', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    );
    await page.route('**/data/all-products.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_PRODUCTS) })
    );

    await page.addInitScript((products) => {
      window.LyrionAtelier = { products };
    }, SAMPLE_PRODUCTS);

    await page.goto(`http://localhost:${PORT}/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-shop-grid]');
    await page.waitForFunction(() => (window as CatalogWindow).LyrionAtelier?.products?.length);
    await page.evaluate((products) => {
      const w = window as CatalogWindow;
      w.LyrionAtelier = w.LyrionAtelier || {};
      w.LyrionAtelier.products = products;
      const originalMount = w.mountGrid;
      if (typeof originalMount === 'function') {
        w.mountGrid = () => originalMount(products);
        originalMount(products);
      }
    }, SAMPLE_PRODUCTS);
    await page.waitForSelector('.product-card', { timeout: 5000 });

    const srcs = await page.locator('[data-shop-grid] .product-card img').evaluateAll((imgs) =>
      imgs.map((img) => (img as HTMLImageElement).getAttribute('src') || '')
    );
    expect(srcs.length).toBeGreaterThanOrEqual(2);
    expect(srcs.every((src) => !!src)).toBeTruthy();
    expect(srcs[0]).toContain(`http://localhost:${PORT}`);
    expect(srcs[1]).toContain('/assets/catalog/placeholder.webp');

    const buyButtons = page.locator('[data-shop-grid] .product-card .product-buy-btn', { hasText: /shop now/i });
    await expect(buyButtons).toHaveCount(2);
  });
});
