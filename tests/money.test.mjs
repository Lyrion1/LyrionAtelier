import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const money = require('../js/money.js');

test('GBP is the catalogue amount, with no rounding', () => {
  const presented = money.presentmentPence(5199, 'GBP');
  assert.equal(presented.minor, 5199);
  assert.equal(presented.major, 51.99);
  assert.equal(money.format(51.99, 'GBP'), new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(51.99));
});

test('USD uses .99 retail rounding from the shared rate', () => {
  // 51.99 * 1.27 = 66.0273 → 65.99
  assert.equal(money.presentmentPence(5199, 'USD').minor, 6599);
  // £50 * 1.27 = 63.50 → 63.99
  assert.equal(money.presentmentPence(5000, 'USD').minor, 6399);
  // £5.99 * 1.27 = 7.6073 → 7.99
  assert.equal(money.presentmentPence(599, 'USD').minor, 799);
  // £5 wheel prize * 1.27 = 6.35 → 5.99
  assert.equal(money.presentmentPence(500, 'USD').minor, 599);
});

test('EUR, CAD and AUD stay on the same rule', () => {
  assert.equal(money.presentmentPence(5000, 'EUR').major, Math.max(0.99, Math.round(50 * 1.17) - 0.01));
  assert.equal(money.presentmentPence(5000, 'CAD').minor, Math.round((Math.max(0.99, Math.round(50 * 1.74) - 0.01)) * 100));
  assert.equal(money.presentmentPence(4699, 'AUD').currency, 'AUD');
});

test('an unknown currency falls back to GBP and does not scale', () => {
  assert.equal(money.normaliseCurrency('xyz'), 'GBP');
  assert.equal(money.presentmentPence(3399, 'BTC').minor, 3399);
});

test('free delivery uses the presented sum, matching the £50 banner', () => {
  money.setLocale({ currency: 'USD', language: 'en' });
  const under = money.quoteShipping([{ gbpMajor: 26, qty: 1 }, { gbpMajor: 23, qty: 1 }], 'USD');
  assert.equal(under.free, false);
  assert.equal(under.minor, 799);
  const over = money.quoteShipping([{ gbpMajor: 50, qty: 1 }], 'USD');
  assert.equal(over.free, true);
  assert.equal(over.minor, 0);
  const gbp = money.quoteShipping([{ gbpMajor: 49.99, qty: 1 }], 'GBP');
  assert.equal(gbp.free, false);
  assert.equal(gbp.minor, 599);
});

test('the currency switch stays off until fx-rates.json turns it on', () => {
  const fx = JSON.parse(readFileSync(new URL('../data/fx-rates.json', import.meta.url), 'utf8'));
  assert.equal(fx.multi_currency_enabled, false);
  assert.equal(money.multiCurrencyEnabled(), false);
  money.setLocale({ currency: 'USD', language: 'en' });
  assert.equal(money.getCurrency(), 'GBP');
  money.setMultiCurrencyEnabled(true);
  money.setLocale({ currency: 'USD', language: 'en' });
  assert.equal(money.getCurrency(), 'USD');
  money.setMultiCurrencyEnabled(false);
  assert.equal(money.getCurrency(), 'GBP');
});

test('the Deno checkout copy publishes the same fallback rates', () => {
  const ts = readFileSync(new URL('../supabase/functions/_shared/money.ts', import.meta.url), 'utf8');
  for (const [code, rate] of Object.entries(money.FALLBACK_RATES)) {
    assert.match(ts, new RegExp(`${code}: ${rate}\\b`));
  }
  assert.match(ts, /nearest - 0\.01/);
  assert.match(ts, /SHIPPING_FREE_GBP_PENCE = 5000/);
  assert.match(ts, /SHIPPING_COST_GBP_PENCE = 599/);
  assert.match(ts, /multi_currency_enabled === true/);
});
