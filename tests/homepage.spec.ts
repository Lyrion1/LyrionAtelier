import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = 4177;
const ROOT = path.resolve(__dirname, '..');

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
    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url || '/', true);
      let pathname = parsed.pathname || '/';

      if (pathname === '/') pathname = '/index.html';
      if (pathname === '/shop') pathname = '/shop.html';
      if (/^\/shop\/[^/]+/.test(pathname)) pathname = '/product.html';

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

test.describe('homepage featured products', () => {
  let server: http.Server;

  test.beforeAll(async () => {
    server = await startServer();
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test.beforeEach(async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );
  });

  test('shows Aries Fire Tee (Youth) in featured grid', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const featuredCard = page.locator('#featured-grid .product-card', { hasText: 'Aries Fire Tee (Youth)' });
    await expect(featuredCard).toBeVisible();
    await expect(featuredCard.locator('.price')).toContainText('$34.99');

    const image = featuredCard.locator('img');
    await expect(image).toHaveAttribute('src', /youth-aries-fire-tee/i);
  });

  test('surfaces Leo Zodiac Hoodie in featured/bestseller grid', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const featuredCard = page.locator('#featured-grid .product-card', { hasText: 'Leo Zodiac Hoodie' });
    await expect(featuredCard).toBeVisible();
    await expect(featuredCard.locator('.price')).toContainText('$59.99');
    const image = featuredCard.locator('img');
    await expect(image).toHaveAttribute('src', /leo-zodiac-hoodie/i);
  });

  test('promotes Cosmic Crewneck - Pisces as the third featured card', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const thirdCard = page.locator('#featured-grid .product-card').nth(2);
    await expect(thirdCard).toContainText('Cosmic Crewneck - Pisces');
    await expect(thirdCard.locator('.price')).toContainText('$55.99');
    const image = thirdCard.locator('img');
    await expect(image).toHaveAttribute('src', /cosmic-crewneck-pisces/i);
  });

  test('shows four featured products on homepage', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const featuredCards = page.locator('#featured-grid .product-card');
    await expect(featuredCards).toHaveCount(4);
  });
});
