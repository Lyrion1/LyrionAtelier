import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = 4175;
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

    await page.goto(`http://localhost:${PORT}/shop/aries-spark-tee-youth`, { waitUntil: 'networkidle' });

    await expect(page.locator('#product-name')).toHaveText(/Aries Spark Tee/i);
    await expect(page.locator('#product-description')).toContainText(/Ignition energy/i);
    await expect(page.locator('#product-price')).toContainText('$34.99');

    const sizeButtons = page.locator('.size-chip');
    await expect(sizeButtons).toHaveCount(5);
    const sizes = await sizeButtons.allInnerTexts();
    expect(sizes).toContain('XS');
    expect(sizes).toContain('XL');

    await page.waitForSelector('#product-gallery img');
    const imgWidth = await page.locator('#product-gallery img').first().evaluate((img) => (img as HTMLImageElement).naturalWidth);
    expect(imgWidth).toBeGreaterThan(50);

    await page.screenshot({ path: 'product-detail-pass.png', fullPage: true });
  });

  test('Aries youth PDP wires size selection to checkout payload', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, body: '' })
    );

    let checkoutPayload: any = null;
    await page.route('**/.netlify/functions/create-checkout-session', (route) => {
      checkoutPayload = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ skipRedirect: true })
      });
    });

    await page.goto(`http://localhost:${PORT}/shop/aries-spark-tee-youth`, { waitUntil: 'networkidle' });

    const xlButton = page.locator('.size-chip', { hasText: 'XL' });
    await xlButton.click();
    await expect(xlButton).toHaveAttribute('aria-pressed', 'true');
    await page.click('#add-to-cart-btn');
    await page.waitForTimeout(200);

    const lineItem = checkoutPayload?.lineItems?.[0];
    const meta = lineItem?.price_data?.product_data?.metadata;
    expect(meta?.pf_variant_id).toBe('694615f9707eb6');
    expect(meta?.size).toBe('XL');
    expect(lineItem?.price_data?.unit_amount).toBe(3499);

    await page.screenshot({ path: 'shop-product-aries-youth.png', fullPage: true });
  });
});
