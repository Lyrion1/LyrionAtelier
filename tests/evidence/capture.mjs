#!/usr/bin/env node
/**
 * Evidence screenshots and layout checks for the pull request.
 *
 * Serves nothing itself: point it at a running static server that resolves
 * URLs the way GitHub Pages does. data/house.json is supplied per scenario
 * from tests/fixtures/house/ by intercepting the request, so the committed
 * site is never edited. Calls to the Edge Functions are answered with
 * recorded shapes so forms can be shown in their finished state.
 *
 *   node tests/evidence/capture.mjs http://127.0.0.1:8765 docs/evidence
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const BASE = process.argv[2] || 'http://127.0.0.1:8765';
const OUT = path.resolve(process.argv[3] || 'docs/evidence');
const FIX = path.resolve('tests/fixtures/house');
mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 375, 430, 768, 1280];
const results = [];

async function open(browser, url, { width = 375, house = null, scheme = 'light', today = null, functions = {} } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 800 ? 820 : 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
  await context.addInitScript(({ today }) => {
    try {
      localStorage.setItem('la_consent', 'false');
      localStorage.setItem('lyrion_wheel_last_spin', String(Date.now()));
      localStorage.setItem('lyrion_locale_preferences', JSON.stringify({ language: 'en', currency: 'GBP' }));
    } catch (e) {}
    if (today) {
      const fixed = new Date(`${today}T10:00:00Z`).getTime();
      const RealDate = Date;
      // Pin "today" so campaign windows can be shown on a chosen day.
      class FixedDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [fixed])); }
        static now() { return fixed; }
      }
      globalThis.Date = FixedDate;
    }
  }, { today });
  await context.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/data/house.json') {
      if (house) return route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(path.join(FIX, house)) });
      return route.fulfill({ status: 404, body: 'Not found' });
    }
    if (u.hostname.endsWith('supabase.co')) {
      const fn = u.pathname.split('/').pop();
      const reply = functions[fn];
      if (reply) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(typeof reply === 'function' ? reply(route.request()) : reply) });
      return route.fulfill({ status: 503, body: '{}' });
    }
    if (u.origin === new URL(BASE).origin || u.hostname.endsWith('googleapis.com') || u.hostname.endsWith('gstatic.com')) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => results.push({ name: `JS error on ${url}`, width, error: e.message }));
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(900);
  return { context, page };
}

/** Layout checks the brief asks for, measured in the page. */
async function audit(page, name, width) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - window.innerWidth;
    const small = [];
    const targets = [];
    const main = document.querySelector('main') || document.body;
    for (const el of main.querySelectorAll('a, button, input, select, textarea, label.gc-include, label.house-consent')) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height || cs.visibility === 'hidden' || el.closest('[hidden]') || el.closest('.house-honeypot')) continue;
      if (el.matches('input[type="checkbox"]')) continue; // measured through its label
      const inline = el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, figcaption, dd');
      if (!inline && (rect.height < 44 || rect.width < 44)) targets.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent || el.value || '').trim().slice(0, 30)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    }
    for (const el of main.querySelectorAll('p, li, dd, label, figcaption, .hint, .house-row__note')) {
      if (!el.textContent.trim() || el.closest('[hidden]') || el.closest('.house-honeypot') || el.matches('.soho-eyebrow, .house-row__eyebrow, .sr-only')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 14) small.push(`${el.tagName.toLowerCase()}.${el.className || ''} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
    }
    const unsized = [...main.querySelectorAll('img')].filter((img) => !(img.getAttribute('width') && img.getAttribute('height')) && !getComputedStyle(img).aspectRatio.includes('/')).map((img) => img.getAttribute('src'));
    return { overflow, targets: targets.slice(0, 12), small: small.slice(0, 12), unsized: unsized.slice(0, 8) };
  });
  results.push({ name, width, ...r });
  return r;
}

async function shot(page, file, full = true) {
  await page.screenshot({ path: path.join(OUT, file), fullPage: full });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
try {
  const only = process.env.ONLY;
  const want = (key) => !only || only.split(',').includes(key);
  // 1. The house moves the shop: three engine states and the fallback.
  if (want('shop')) {
  const scenarios = [
    ['shop-no-house', null],
    ['shop-scorpio-on-show', 'scorpio-on-show.json'],
    ['shop-libra-last-chance', 'libra-last-chance.json'],
    ['shop-taurus-retired', 'taurus-retired.json'],
    ['shop-malformed-house', 'malformed.json'],
  ];
  for (const [name, house] of scenarios) {
    for (const width of [375, 1280]) {
      const { context, page } = await open(browser, '/shop', { width, house });
      await page.waitForSelector('.product-card', { timeout: 8000 }).catch(() => {});
      await audit(page, name, width);
      await shot(page, `${name}-${width}.png`);
      await context.close();
    }
  }
  }

  // Homepage: house-led grid, and the campaign feature on and off.
  if (want('home')) {
  for (const [name, house, today] of [['home-scorpio-on-show', 'scorpio-on-show.json', '2026-10-07'], ['home-retrograde-campaign', 'scorpio-on-show.json', '2026-10-30'], ['home-no-house', null, '2026-10-30']]) {
    for (const width of [375, 1280]) {
      const { context, page } = await open(browser, '/', { width, house, today });
      await page.waitForSelector('#featured-grid .product-card', { timeout: 8000 }).catch(() => {});
      const campaign = await page.$eval('[data-campaign-feature]', (n) => !n.hidden).catch(() => false);
      results.push({ name: `${name} campaign visible`, width, value: campaign });
      const el = await page.$('[data-campaign-feature]:not([hidden])') || await page.$('#featured-grid');
      await el.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUT, `${name}-${width}.png`), fullPage: false });
      await context.close();
    }
  }
  }

  // A retired piece's own page cannot be bought.
  if (want('pdp'))
  for (const width of [375, 1280]) {
    const { context, page } = await open(browser, '/shop/taurus-ram-hoodie', { width, house: 'taurus-retired.json' });
    await page.waitForSelector('[data-house-retired]', { timeout: 8000 }).catch(() => {});
    const btn = await page.$eval('#add-to-cart-btn', (b) => ({ disabled: b.disabled, text: b.textContent.trim() })).catch(() => null);
    results.push({ name: 'retired product page button', width, value: btn });
    await page.$eval('#add-to-cart-btn', (b) => b.scrollIntoView({ block: 'center' })).catch(() => {});
    await shot(page, `pdp-taurus-retired-${width}.png`, false);
    await context.close();
  }

  // 2. Codex article from the queue (published into a scratch copy by the caller).
  // Run with ONLY=codex against a copy of the site in which
  // scripts/publish-codex.mjs has published tests/fixtures/codex-queue.
  if (only === 'codex') {
    for (const width of [375, 1280]) {
      for (const [url, file] of [['/codex/venus-in-the-scales', 'codex-article'], ['/codex', 'codex-index']]) {
        const { context, page } = await open(browser, url, { width });
        await audit(page, file, width);
        if (file === 'codex-index') {
          await page.$eval('.codex-journal', (n) => n.scrollIntoView()).catch(() => {});
          await page.screenshot({ path: path.join(OUT, `${file}-${width}.png`), fullPage: false });
        } else {
          await shot(page, `${file}-${width}.png`);
        }
        await context.close();
      }
    }
  }

  // 3. New pages at every width, both colour schemes.
  const birthdayOk = { ok: true, saved: 2 };
  const pages = [
    ['gift-concierge', '/gift-concierge?day=29&month=10&for=Ada'],
    ['birthday-book', '/birthday-book'],
    ['partners', '/partners'],
    ['pet-chart', '/charts/pet-birth-chart'],
    ['newborn-chart', '/charts/newborn-birth-chart'],
  ];
  for (const [name, url] of want('pages') ? pages : []) {
    for (const width of WIDTHS) {
      for (const scheme of width === 375 || width === 1280 ? ['light', 'dark'] : ['light']) {
        const { context, page } = await open(browser, url, { width, scheme, house: 'scorpio-on-show.json', functions: { 'birthday-book': birthdayOk, enquiry: { ok: true } } });
        await page.waitForTimeout(500);
        const r = await audit(page, `${name}${scheme === 'dark' ? ' (dark)' : ''}`, width);
        if (width === 375 || width === 1280) await shot(page, `${name}-${width}${scheme === 'dark' ? '-dark' : ''}.png`);
        if (r.overflow > 0) console.warn(`overflow on ${name} at ${width}: ${r.overflow}px`);
        await context.close();
      }
    }
  }

  // Gift Concierge with the year given: the full set.
  if (want('concierge'))
  for (const width of [375, 1280]) {
    const { context, page } = await open(browser, '/gift-concierge?day=29&month=10&for=Ada', { width, house: 'libra-last-chance.json' });
    await page.fill('#gc-year', '1994');
    await page.click('#gc-form button[type="submit"]');
    await page.waitForSelector('.gc-card', { timeout: 6000 }).catch(() => {});
    await page.fill('#gc-note', 'Happy birthday, Ada. With love from all of us.');
    await audit(page, 'gift-concierge set', width);
    await shot(page, `gift-concierge-set-${width}.png`);
    await context.close();
  }

  // Basket with a reading: the details form and the gift note.
  if (want('cart'))
  for (const width of [375, 1280]) {
    const { context, page } = await open(browser, '/', { width });
    await page.evaluate(() => {
      localStorage.setItem('cart', JSON.stringify([
        { id: 'solar-return-reading', slug: 'solar-return-reading', name: 'Solar Return Reading', price: 58, size: 'Standard', quantity: 1, category: 'reading', details: { people: [{ name: 'Ada', date: '1994-10-29' }] } },
        { id: 'leo-zodiac-hoodie', slug: 'leo-zodiac-hoodie', name: 'Leo Zodiac Hoodie', price: 46.99, size: 'M', quantity: 1, category: 'zodiac-hero', printfulVariantId: '694b0b7b427766' },
      ]));
      localStorage.setItem('lyrion_gift', JSON.stringify({ note: 'Happy birthday, Ada.', recipient: '' }));
    });
    await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForSelector('.cart-details__item', { timeout: 6000 }).catch(() => {});
    await audit(page, 'cart details', width);
    await shot(page, `cart-details-${width}.png`);
    await context.close();
  }

  // Birthday Book after saving.
  if (want('birthday'))
  for (const width of [375, 1280]) {
    const { context, page } = await open(browser, '/birthday-book', { width, functions: { 'birthday-book': { ok: true, saved: 1 } } });
    await page.fill('#bb-email', 'reader@example.com');
    await page.fill('#bb-name-1', 'Ada');
    await page.selectOption('#bb-day-1', '29');
    await page.selectOption('#bb-month-1', '10');
    await page.check('#bb-consent');
    await page.click('#bb-submit');
    await page.waitForSelector('#bb-done:not([hidden])', { timeout: 4000 }).catch(() => {});
    await shot(page, `birthday-book-saved-${width}.png`, false);
    await context.close();
  }
} finally {
  await browser.close();
}

writeFileSync(path.join(OUT, 'layout-audit.json'), `${JSON.stringify(results, null, 2)}\n`);
const bad = results.filter((r) => r.overflow > 0 || (r.targets && r.targets.length) || (r.small && r.small.length));
console.log(`${results.length} checks; ${bad.length} with findings`);
for (const b of bad) console.log(JSON.stringify(b));
