import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = 4175;
const ROOT = path.resolve(__dirname, '..');
const SUN_CREST_2XL = '69455454069045';

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
      if (/^\/shop\/[^/]+/.test(pathname)) pathname = '/shop-product.html';

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

test.describe('product detail page', () => {
  let server: http.Server;

  test.beforeAll(async () => {
    server = await startServer();
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('renders product information from catalog', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );

    await page.goto(`http://localhost:${PORT}/shop/aries-spark-youth-tee`, { waitUntil: 'networkidle' });

    await expect(page.locator('#product-title')).toHaveText(/Aries Spark Tee/i);
    await expect(page.locator('#product-description')).toContainText(/Ignition energy/i);
    await expect(page.locator('#product-price')).toContainText('$34.99');

    const sizeOptions = await page.locator('#product-sizes .pill').allInnerTexts();
    expect(sizeOptions).toContain('S');

    const imgWidth = await page.locator('#product-image').evaluate((img) => (img as HTMLImageElement).naturalWidth);
    expect(imgWidth).toBeGreaterThan(50);

    await page.screenshot({ path: 'product-detail-pass.png', fullPage: true });
  });

  test('Sun Crest PDP wires size selection to checkout payload', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );

    let checkoutPayload: any = null;
    await page.route('**/.netlify/functions/checkout', (route) => {
      checkoutPayload = route.request().postDataJSON();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto(`http://localhost:${PORT}/shop/lyrion-premium-sweatshirt`, { waitUntil: 'networkidle' });

    const sizeButtons = page.locator('#product-sizes button');
    await expect(sizeButtons).toHaveCount(5);
    await expect(page.locator('#buy-now-btn')).toBeEnabled();

    await sizeButtons.filter({ hasText: '2XL' }).click();
    await page.click('#buy-now-btn');
    await page.waitForTimeout(200);

    expect(checkoutPayload?.items?.[0]?.sku).toBe(SUN_CREST_2XL);
    expect(checkoutPayload?.items?.[0]?.qty || checkoutPayload?.items?.[0]?.quantity).toBe(1);

    await page.screenshot({ path: 'shop-product-sun-crest.png', fullPage: true });
  });
});
