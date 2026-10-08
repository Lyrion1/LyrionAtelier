#!/usr/bin/env node
/**
 * Build-time guard: one slug per product, everywhere it is sold.
 *
 * Fails when
 *   1. data/catalogue.json is malformed or breaks a catalogue rule,
 *   2. the checkout price map (public/data/products.json) differs from what
 *      the catalogue generates,
 *   3. a hand-built product page (shop/*.html) sells a slug, variant or price
 *      the catalogue does not have,
 *   4. a reading, certificate or keepsake button names a product or price the
 *      catalogue does not have,
 *   5. a Printful variant id is missing from the Printful snapshot
 *      (data/printful-sync.json, written by the Printful sync workflow), when
 *      that snapshot exists,
 *   6. the house rules copied for the Edge Functions drift from js/house-core.js,
 *   7. a page shows a copyright line without the legal operator.
 *
 * The house engine's own files (data/house.json, data/designs-queue.json,
 * data/codex-queue/) are reported on, never failed on: the site must accept
 * whatever the engine writes, including nothing.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  CHECKOUT_MAP_PATH,
  PRINTFUL_SNAPSHOT_PATH,
  loadCatalogue,
  validateCatalogue,
  buildCheckoutMap,
  houseCore,
} from './lib/catalog.mjs';
import { checkStaticPages } from './sync-static-pages.mjs';

const errors = [];
const notes = [];

let catalogue;
try {
  catalogue = await loadCatalogue();
} catch (err) {
  console.error(`Catalogue verification FAILED: data/catalogue.json could not be read: ${err.message}`);
  process.exit(1);
}
errors.push(...validateCatalogue(catalogue));
const bySlug = new Map(catalogue.products.map((p) => [p.slug, p]));

// 2. Checkout price map
try {
  const actual = JSON.parse(await readFile(CHECKOUT_MAP_PATH, 'utf8'));
  const expected = buildCheckoutMap(catalogue);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const a = new Map(actual.map((e) => [e.id, JSON.stringify(e)]));
    const b = new Map(expected.map((e) => [e.id, JSON.stringify(e)]));
    for (const id of b.keys()) if (!a.has(id)) errors.push(`"${id}" is for sale but missing from the checkout price map`);
    for (const id of a.keys()) if (!b.has(id)) errors.push(`"${id}" is in the checkout price map but not for sale in the catalogue`);
    for (const [id, v] of b) if (a.has(id) && a.get(id) !== v) errors.push(`"${id}" differs between the catalogue and the checkout price map`);
    if (!errors.length) errors.push('the checkout price map is out of order; regenerate it');
  }
} catch (err) {
  errors.push(`could not read the checkout price map: ${err.message}`);
}

// 3. Static product pages
const { problems } = await checkStaticPages(catalogue);
errors.push(...problems);

// 4. Reading, certificate and keepsake buttons
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(path.join(REPO_ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'tests', 'tools', 'admin', 'components', 'docs', 'printful-files', '_incoming'].includes(entry.name)) continue;
      out.push(...await htmlFiles(rel));
    } else if (entry.name.endsWith('.html')) {
      out.push(rel);
    }
  }
  return out;
}
const pages = await htmlFiles('.');
for (const file of pages) {
  const html = await readFile(path.join(REPO_ROOT, file), 'utf8');
  for (const m of html.matchAll(/<button[^>]*class="[^"]*(?:purchase-reading-button|book-reading-btn)[^"]*"[^>]*>/g)) {
    const tag = m[0];
    const id = (/data-product-id="([^"]+)"/.exec(tag) || /data-reading-id="([^"]+)"/.exec(tag) || [])[1];
    const price = Number((/data-price="([^"]+)"/.exec(tag) || [])[1]);
    const product = id && bySlug.get(id);
    if (!product) { errors.push(`${file}: a buy button names "${id ?? '(nothing)'}", which is not in the catalogue`); continue; }
    if (product.fulfilment === 'enquiry' || !product.listed) errors.push(`${file}: "${id}" is not for sale but has a buy button`);
    if (price !== product.price_gbp.min) errors.push(`${file}: "${id}" button says ${price}, the catalogue says ${product.price_gbp.min}`);
  }
  // 7. Legal operator on every footer
  if (/&copy;|©/.test(html) && !html.includes('LYRION LTD')) errors.push(`${file}: copyright line without LYRION LTD`);
  if (/&copy; 20\d\d Lyrion Atelier/.test(html)) errors.push(`${file}: fixed-year copyright line`);
}

// The footer every page shows is built by js/main.js.
const mainJs = await readFile(path.join(REPO_ROOT, 'js', 'main.js'), 'utf8');
if (!mainJs.includes('LYRION LTD') || !mainJs.includes('16904877')) errors.push('js/main.js: the site footer must name LYRION LTD and its company number');
if (/&copy; 20\d\d/.test(mainJs)) errors.push('js/main.js: the footer copyright year must be the current year, not a fixed one');

// 5. Printful snapshot
if (existsSync(PRINTFUL_SNAPSHOT_PATH)) {
  try {
    const snapshot = JSON.parse(await readFile(PRINTFUL_SNAPSHOT_PATH, 'utf8'));
    const known = new Set();
    for (const p of snapshot.products || []) for (const v of p.sync_variants || []) {
      if (v.external_id) known.add(String(v.external_id));
      if (v.id) known.add(String(v.id));
    }
    for (const p of catalogue.products) {
      if (p.fulfilment !== 'printful' || !p.listed) continue;
      for (const v of p.variants) {
        if (!known.has(String(v.printful_variant_id))) errors.push(`"${p.slug}" ${v.size}${v.color ? ` ${v.color}` : ''}: Printful has no sync variant ${v.printful_variant_id}`);
      }
    }
    notes.push(`Printful snapshot of ${snapshot.fetched_at || 'unknown date'} checked: ${known.size} variant ids.`);
  } catch (err) {
    errors.push(`data/printful-sync.json is unreadable: ${err.message}`);
  }
} else {
  notes.push('No Printful snapshot yet (data/printful-sync.json); variant ids were checked for format and uniqueness only.');
}

// 6. Edge Function copy of the house rules
const a = await readFile(path.join(REPO_ROOT, 'js', 'house-core.js'), 'utf8');
const b = await readFile(path.join(REPO_ROOT, 'supabase', 'functions', '_shared', 'house-core.js'), 'utf8').catch(() => '');
if (a !== b) errors.push('supabase/functions/_shared/house-core.js differs from js/house-core.js; copy it across');

// Engine files: report only.
async function report(file, check) {
  const full = path.join(REPO_ROOT, file);
  if (!existsSync(full)) { notes.push(`${file}: absent (the site shows everything as before)`); return; }
  try { notes.push(`${file}: ${check(JSON.parse(await readFile(full, 'utf8')))}`); } catch (err) { notes.push(`${file}: unreadable (${err.message}); the site ignores it`); }
}
await report('data/house.json', (raw) => {
  const h = houseCore.normaliseHouse(raw);
  return h.valid ? `valid, lead sign ${h.lead_sign}, ${h.campaigns.length} campaign(s)` : `ignored by the site: ${h.reason}`;
});
await report('data/designs-queue.json', (raw) => Array.isArray(raw) ? `${raw.length} design(s) queued` : 'not a list; the design intake ignores it');

if (errors.length) {
  console.error(`Catalogue verification FAILED with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nFix data/catalogue.json, then run: npm run build:catalog && node scripts/sync-static-pages.mjs');
  process.exit(1);
}
const listed = catalogue.products.filter((p) => p.listed).length;
console.log(`Catalogue verification passed: ${catalogue.products.length} products (${listed} listed), one slug each across the shop, product pages, buttons and checkout.`);
for (const n of notes) console.log(`  · ${n}`);
