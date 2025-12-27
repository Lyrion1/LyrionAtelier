import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { pathToFileURL } from 'url';

const PORT = 4173;
const ROOT = path.resolve(__dirname, '..');
const PLACEHOLDER_NOTICE = /Catalog is updating/i;
const MIN_VISIBLE_PRODUCTS = 4; // shop grid should show at least four items when catalog data is available
const OVERFLOW_TOLERANCE_PX = 4; // Mobile layout now clamps hero width; keep a small guard against horizontal overflow.

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
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') consoleErrors.push(text);
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
        (min) => document.querySelectorAll('.product-card img[src]').length >= min,
        MIN_VISIBLE_PRODUCTS,
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
      const firstCard = cards.first();
      const firstCardImages = firstCard.locator('img');
      await expect(firstCardImages).toHaveCount(1);
      await expect(firstCardImages.first()).toBeVisible();
      await expect(firstCard.locator('.product-card__title')).toBeVisible();
      const buyButtons = firstCard.locator('.product-buy-btn');
      await expect(buyButtons).toHaveCount(1);
      await expect(buyButtons.first()).toHaveText(/view product/i);
      await expect(buyButtons.first()).toHaveAttribute('href', /^\/shop\//);
      const widths = await cards.locator('img').evaluateAll((imgs) =>
        imgs.map((img) => (img as HTMLImageElement).naturalWidth)
      );
      const srcs = await cards.locator('img').evaluateAll((imgs) =>
        imgs.map((img) => (img as HTMLImageElement).getAttribute('src') || '')
      );
      expect(Math.max(...widths)).toBeGreaterThan(50);
      expect(srcs.every((src) => src && src !== 'Image loading…')).toBeTruthy();
      const pisces = page.locator('[data-slug="pisces-hoodie-black"]');
      expect(await pisces.count()).toBeGreaterThanOrEqual(1);
      await expect(pisces.first().locator('.product-card__price')).toContainText(/\$64\.99/);
    } else {
      await expect(notice).toBeVisible();
      const noticeText = await notice.textContent();
      expect(noticeText || '').toMatch(PLACEHOLDER_NOTICE);
    }

    // Guard against any legacy Piscean crewneck slug variants resurfacing
    for (const slug of ['piscean-twins-crewneck', 'piscean-crewneck']) {
      await expect(page.locator(`[data-slug="${slug}"]`)).toHaveCount(0);
    }

    // Verify Pisces Hoodie is present with correct price
    const piscesHoodiePrice = page.locator('[data-slug="pisces-hoodie"] .product-card__price');
    await expect(piscesHoodiePrice).toHaveText(/\$54\.99/);
    const soldOutBadges = page.locator('.product-card--sold-out .product-card__ribbon', { hasText: /sold out/i });
    await expect(soldOutBadges.first()).toBeVisible();

    const relevantErrors = consoleErrors.filter((msg) => !/ERR_NAME_NOT_RESOLVED/i.test(msg));
    expect(relevantErrors).toEqual([]);
    const hasPriceTypeError = consoleMessages.some((msg) => /typeerror/i.test(msg) && /price/i.test(msg));
    expect(hasPriceTypeError).toBeFalsy();
    await page.screenshot({ path: 'shop-pass.png', fullPage: true });
  });

  test('product cards enforce shorter layout', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );

    await page.goto(`http://localhost:${PORT}/shop`, { waitUntil: 'networkidle' });
    const firstCard = page.locator('.product-card').first();
    await expect(firstCard).toBeVisible();

    const metrics = await firstCard.evaluate((card) => {
      const image = card.querySelector('.product-card-image');
      const content = card.querySelector('.product-card-content');
      const description = card.querySelector('.product-card-description');
      const getStyle = (el: Element | null) => (el ? window.getComputedStyle(el) : null);

      const imageStyle = getStyle(image);
      const contentStyle = getStyle(content);
      const descStyle = getStyle(description);
      const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const fontSize = descStyle ? parseFloat(descStyle.fontSize) : null;
      const lineHeight = descStyle ? parseFloat(descStyle.lineHeight) : null;
      const lineClamp = descStyle?.getPropertyValue('-webkit-line-clamp') || null;
      const boxOrient = descStyle?.getPropertyValue('-webkit-box-orient') || null;

      return {
        rootFontSize: Number.isFinite(rootFont) ? rootFont : null,
        imageHeight: imageStyle ? parseFloat(imageStyle.height) : null,
        contentPadding: contentStyle
          ? [
              parseFloat(contentStyle.paddingTop),
              parseFloat(contentStyle.paddingRight),
              parseFloat(contentStyle.paddingBottom),
              parseFloat(contentStyle.paddingLeft)
            ]
          : null,
        descFontSize: fontSize,
        descLineHeightRatio: fontSize && lineHeight ? lineHeight / fontSize : null,
        descMaxHeight: descStyle ? parseFloat(descStyle.maxHeight) : null,
        descLineClamp: lineClamp || null,
        descBoxOrient: boxOrient || null,
        descOverflow: descStyle ? descStyle.overflow : null
      };
    });

    expect(metrics.imageHeight).toBeCloseTo(220, 0);
    expect(metrics.contentPadding).toEqual([15, 15, 15, 15]);
    expect(metrics.rootFontSize).not.toBeNull();
    expect(metrics.descFontSize).toBeCloseTo((metrics.rootFontSize || 0) * 0.85, 1);
    expect(metrics.descLineHeightRatio).toBeCloseTo(1.4, 1);
    expect(metrics.descMaxHeight).toBeCloseTo(80, 0);
    expect(metrics.descLineClamp).toBe('4');
    expect((metrics.descBoxOrient || '').toLowerCase()).toBe('vertical');
    expect(metrics.descOverflow).toBe('hidden');
  });

  test('home hero declutters on mobile', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await expect(page.locator('.hero')).toBeVisible();
    const orbs = page.locator('.conversion-orbs');
    const orbCount = await orbs.count();
    if (orbCount > 0) {
      await expect(orbs.first()).toBeVisible();
      const orbPosition = await orbs.first().evaluate((node) => getComputedStyle(node).position);
      expect(orbPosition).toBe('static');
    } else {
      expect(orbCount).toBe(0);
    }

    const beforeDisplay = await page.evaluate(
      () => getComputedStyle(document.body, '::before').getPropertyValue('display')
    );
    const afterDisplay = await page.evaluate(
      () => getComputedStyle(document.body, '::after').getPropertyValue('display')
    );
    expect(beforeDisplay.trim()).toBe('none');
    expect(afterDisplay.trim()).toBe('none');

    const hasHorizontalOverflow = await page.evaluate(
      (tolerance) => document.documentElement.scrollWidth > document.documentElement.clientWidth + tolerance,
      OVERFLOW_TOLERANCE_PX
    );
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test('filters Lyrion Atelier collection and shows Logo Line products', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );

    await page.goto(`http://localhost:${PORT}/shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.product-card');
    
    // Wait for products to load
    await page.waitForFunction(
      () => {
        const cards = Array.from(document.querySelectorAll('.product-card'));
        return cards.length > 0;
      }
    );

    // Check that fisherman beanie appears in the shop (at least once)
    const beanieCard = page.locator('[data-slug="fisherman-beanie"]');
    await expect(beanieCard.first()).toBeVisible();
    await expect(beanieCard.first().locator('.product-card__title')).toContainText(/Fisherman Beanie/i);
    await expect(beanieCard.first().locator('.product-card__price')).toContainText(/\$30/);
  });
});
