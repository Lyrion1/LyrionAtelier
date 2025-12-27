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

  test('shows Youth Aries Heavy Blend Hoodie in featured grid', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const featuredCard = page.locator('#featured-grid .product-card', { hasText: 'Youth Aries Heavy Blend Hoodie' });
    await expect(featuredCard).toBeVisible();
    await expect(featuredCard.locator('.price')).toContainText('$42.99');

    const images = featuredCard.locator('img');
    await expect(images).toHaveCount(1);
    await expect(images.first()).toHaveAttribute('src', /youth-aries-heavy-blend-hoodie\/youth-aries-hoodie-lifestyle\.jpg/i);
  });

  test('surfaces Leo Zodiac Hoodie in featured/bestseller grid', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const featuredCard = page.locator('#featured-grid .product-card', { hasText: 'Leo Zodiac Hoodie' });
    await expect(featuredCard).toBeVisible();
    await expect(featuredCard.locator('.price')).toContainText('$59.99');
    const images = featuredCard.locator('img');
    await expect(images).toHaveCount(1);
    await expect(images.first()).toHaveAttribute('src', /leo-zodiac-hoodie/i);
  });

  test('promotes Cosmic Crewneck - Pisces as the third featured card', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const thirdCard = page.locator('#featured-grid .product-card').nth(2);
    await expect(thirdCard).toContainText('Cosmic Crewneck - Pisces');
    await expect(thirdCard.locator('.price')).toContainText('$55.99');
    const images = thirdCard.locator('img');
    await expect(images).toHaveCount(1);
    await expect(images.first()).toHaveAttribute('src', /cosmic-crewneck-pisces/i);
  });

  test('shows four featured products on homepage', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const featuredCards = page.locator('#featured-grid .product-card');
    await expect(featuredCards).toHaveCount(4);
    const imageCounts = await featuredCards.evaluateAll((cards) =>
      cards.map((card) => card.querySelectorAll('img').length)
    );
    expect(imageCounts.every((count) => count === 1)).toBeTruthy();
  });

  test('opens Cosmic Crewneck details from homepage view action', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const cosmicCard = page.locator('#featured-grid .product-card', { hasText: 'Cosmic Crewneck - Pisces' }).first();
    const viewLink = cosmicCard.getByRole('link', { name: 'View' });

    await Promise.all([
      page.waitForURL(/product\.html.*cosmic-crewneck-pisces/),
      viewLink.click()
    ]);

    await expect(page).toHaveURL(/product\.html.*cosmic-crewneck-pisces/);
    await expect(page.locator('#product-name')).toContainText('Cosmic Crewneck - Pisces');
    await expect(page.locator('#size-select')).toBeVisible();
  });

  test('opens Gemini Starlight Tee with full gallery from homepage view', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    const geminiCard = page.locator('#featured-grid .product-card', { hasText: 'Gemini Starlight Tee' }).first();
    const viewLink = geminiCard.getByRole('link', { name: 'View' });

    await Promise.all([
      page.waitForURL(/product\.html.*gemini-starlight-tee/),
      viewLink.click()
    ]);

    await expect(page).toHaveURL(/product\.html.*gemini-starlight-tee/);
    await expect(page.locator('#product-name')).toContainText('Gemini Starlight Tee');
    await expect(page.locator('#product-gallery img')).toHaveCount(4);
  });
});
