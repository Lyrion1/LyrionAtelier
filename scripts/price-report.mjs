#!/usr/bin/env node
/**
 * Before-and-after price table for every product a customer could pay for.
 *
 *   node scripts/price-report.mjs [base-commit] > docs/evidence/prices.md
 *
 * "Before" is read from git at the base commit (default: the commit before
 * the house automation merge): the product data the shop and product page
 * showed (data/all-products.json), the standalone product pages (shop/*.html)
 * and the price list checkout charged (public/data/products.json).
 * "After" is read from the working tree.
 *
 * Other currencies are converted with js/main.js's own function and default
 * rates, so a product whose pound price is unchanged is unchanged in every
 * currency. The site refreshes those rates from a live feed, which moves the
 * converted figures the same way before and after.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const BASE = process.argv[2] || 'f05a914';
const git = (path) => execFileSync('git', ['show', `${BASE}:${path}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
const gitList = (dir) => execFileSync('git', ['ls-tree', '--name-only', BASE, `${dir}/`], { encoding: 'utf8' }).split('\n').filter(Boolean);

// The site's own conversion, taken from js/main.js so the report cannot drift from it.
const mainJs = readFileSync('js/main.js', 'utf8');
const pick = (re) => { const m = re.exec(mainJs); if (!m) throw new Error(`js/main.js: ${re} not found`); return m[0]; };
const sandbox = {};
vm.runInNewContext(
  [
    "const BASE_CURRENCY = 'GBP';",
    pick(/const CURRENCY_RATES = \{[\s\S]*?\};/),
    pick(/function retailRound\(amount\) \{[\s\S]*?\n\}/),
    pick(/function convertBaseToCurrency\(baseAmount, currency\) \{[\s\S]*?\n\}/),
    'this.convert = convertBaseToCurrency; this.rates = CURRENCY_RATES;',
  ].join('\n'),
  sandbox,
);
const CURRENCIES = Object.keys(sandbox.rates);

const pence = (n) => Math.round(Number(n) * 100);
const gbp = (p) => (p == null ? '—' : `£${(p / 100).toFixed(2)}`);
const range = (list) => {
  const xs = [...new Set(list.filter((x) => x != null))].sort((a, b) => a - b);
  if (!xs.length) return '—';
  return xs.length === 1 ? gbp(xs[0]) : `${gbp(xs[0])}–${gbp(xs.at(-1))}`;
};
const money = (amount, currency) => {
  const v = sandbox.convert(amount, currency);
  return currency === 'JPY' ? `¥${v}` : v.toFixed(2);
};

// Before
const oldMap = JSON.parse(git('public/data/products.json'));
const oldAll = new Map(JSON.parse(git('data/all-products.json')).map((p) => [p.slug || p.id, p]));
const oldStatic = new Map();
for (const file of gitList('shop').filter((f) => f.endsWith('.html'))) {
  const html = git(file);
  const id = (/id: '([^']+)'/.exec(html) || [])[1];
  const prices = [...html.matchAll(/\{ size: '[^']*', variantId: '[^']*', price: ([\d.]+) \}/g)].map((m) => pence(m[1]));
  if (id) oldStatic.set(id, { file, prices });
}
// Readings and certificates were shown on buttons but were not in the checkout price list.
const oldButtons = new Map();
for (const file of execFileSync('git', ['grep', '-l', 'data-price=', BASE, '--', '*.html'], { encoding: 'utf8' }).split('\n').filter(Boolean)) {
  const html = git(file.slice(BASE.length + 1));
  for (const m of html.matchAll(/<button[^>]*class="[^"]*(?:purchase-reading-button|book-reading-btn)[^"]*"[^>]*>/g)) {
    const id = (/data-(?:product|reading)-id="([^"]+)"/.exec(m[0]) || /data-certificate-tier="([^"]+)"/.exec(m[0]) || [])[1];
    const price = (/data-price="([^"]+)"/.exec(m[0]) || [])[1];
    if (id && price) oldButtons.set(id, pence(price));
  }
}

// After
const catalogue = JSON.parse(readFileSync('data/catalogue.json', 'utf8'));
const newMap = new Map(JSON.parse(readFileSync('public/data/products.json', 'utf8')).map((p) => [p.id, p]));
const bySlug = new Map(catalogue.products.map((p) => [p.slug, p]));
const newStatic = new Map();
for (const p of catalogue.products) {
  try {
    const html = readFileSync(`shop/${p.slug}.html`, 'utf8');
    newStatic.set(p.slug, [...html.matchAll(/\{ size: '[^']*', variantId: '[^']*', price: ([\d.]+) \}/g)].map((m) => pence(m[1])));
  } catch { /* no standalone page */ }
}
// The old reading ids that the catalogue renamed.
const RENAMED = {
  'life-path': 'life-path-reading',
  'solar-return': 'solar-return-reading',
  '2026-written-for-you': '2026-reading',
  'digital-certificate': 'compatibility-digital-certificate',
  'luxury-print': 'compatibility-luxury-print',
  'museum-framed': 'compatibility-museum-framed',
  'twin-flames': 'compatibility-twin-flames',
};

const rows = [];
let changedCharge = 0;
let changedShown = 0;
for (const old of oldMap) {
  const now = bySlug.get(old.id);
  const before = oldAll.get(old.id);
  const beforeShown = (before?.variants || []).map((v) => pence(v.price));
  const afterShown = now ? now.variants.map((v) => pence(v.price_gbp)) : [];
  const beforeStatic = oldStatic.get(old.id)?.prices || [];
  const afterStatic = newStatic.get(old.id) || [];
  const chargedAfter = newMap.get(old.id)?.priceGBP ?? null;
  if (chargedAfter !== old.priceGBP) changedCharge += 1;
  if (range(beforeShown) !== range(afterShown)) changedShown += 1;
  rows.push({
    id: old.id,
    listed: now?.listed ?? false,
    beforeShown: range(beforeShown),
    beforeStatic: beforeStatic.length ? range(beforeStatic) : '',
    beforeCharged: gbp(old.priceGBP),
    afterShown: range(afterShown),
    afterStatic: afterStatic.length ? range(afterStatic) : '',
    chargedNow: gbp(chargedAfter),
    chargedLater: range(afterShown),
    min: old.priceGBP,
  });
}

const out = [];
out.push(`# Prices before and after the house automation`);
out.push('');
out.push(`Generated by \`node scripts/price-report.mjs ${BASE}\`. "Before" is commit \`${BASE}\`, the last commit on main before PR #455.`);
out.push('');
out.push(`## Physical products a customer could pay for before (${oldMap.length})`);
out.push('');
out.push('Pound prices. "Shop and product page" is what the shop grid and `/product?slug=` showed; "standalone page" is the old `shop/*.html` page, where one exists; "charged" is what Stripe took for **every** size.');
out.push('');
out.push('| Product | Before: shop and product page | Before: standalone page | Before: charged | After: shown everywhere | After: charged today | After: charged once the new checkout is deployed |');
out.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  out.push(`| \`${r.id}\` | ${r.beforeShown} | ${r.beforeStatic || '—'} | ${r.beforeCharged} | ${r.afterShown} | ${r.chargedNow} | ${r.chargedLater} |`);
}
out.push('');
out.push(`Checkout price list: ${changedCharge} of ${oldMap.length} changed. Shop and product page prices: ${changedShown} of ${oldMap.length} changed.`);
out.push('');
out.push('## Every currency');
out.push('');
out.push('The starting price of each product in each currency the site offers, at the default rates in `js/main.js` (unchanged by this work). Before and after are the same figure wherever the pound price is the same.');
out.push('');
out.push(`| Product | ${CURRENCIES.join(' | ')} | Same before and after |`);
out.push(`| --- | ${CURRENCIES.map(() => '---').join(' | ')} | --- |`);
for (const r of rows) {
  const after = newMap.get(r.id)?.priceGBP;
  const same = after === r.min;
  out.push(`| \`${r.id}\` | ${CURRENCIES.map((c) => money(r.min / 100, c)).join(' | ')} | ${same ? 'yes' : `**no** (after: £${(after / 100).toFixed(2)})`} |`);
}
out.push('');
const added = catalogue.products.filter((p) => p.listed && p.fulfilment === 'printful' && !oldMap.some((o) => o.id === p.slug));
if (added.length) {
  out.push('## Physical products that could not be paid for before');
  out.push('');
  out.push('These had a page but were missing from the checkout price list, so checkout refused them.');
  out.push('');
  out.push('| Product | Before: shop and product page | Before: standalone page | After: price |');
  out.push('| --- | --- | --- | --- |');
  for (const p of added) {
    const shop = (oldAll.get(p.slug)?.variants || []).map((v) => pence(v.price));
    const page = oldStatic.get(p.slug)?.prices || [];
    out.push(`| \`${p.slug}\` | ${range(shop)} | ${range(page)} | ${range(p.variants.map((v) => pence(v.price_gbp)))} |`);
  }
  out.push('');
}
out.push('## Readings and certificates');
out.push('');
out.push('Shown with these prices before, but missing from the checkout price list, so checkout refused them.');
out.push('');
out.push('| Product | Before: button price | After: price | After |');
out.push('| --- | --- | --- | --- |');
for (const [id, price] of oldButtons) {
  const now = bySlug.get(RENAMED[id] || id);
  const how = !now ? 'not in the catalogue' : now.fulfilment === 'enquiry' ? 'by enquiry, not bought online' : 'bought online';
  out.push(`| \`${id}\`${RENAMED[id] ? ` (now \`${RENAMED[id]}\`)` : ''} | ${gbp(price)} | ${now ? gbp(pence(now.price_gbp.min)) : '—'} | ${how} |`);
}
console.log(out.join('\n'));
