#!/usr/bin/env node
/**
 * Build-time guard: a product that cannot be bought must not be listed for
 * sale. Fails the build when
 *   1. a listed product has no resolvable GBP price,
 *   2. two listed products collide on the same slug,
 *   3. a listed product has no image or no name,
 *   4. the committed checkout price map has drifted from the catalog.
 *
 * (4) is the one that would have caught the live failure: the catalog listed
 * aquarius-crop-hoodie while the checkout map had never heard of it, so the
 * customer reached checkout and got "Unknown product: aquarius-crop-hoodie".
 */
import { readFile } from 'node:fs/promises';
import {
  loadCatalog,
  buildCheckoutMap,
  canonicalSlug,
  isListedForSale,
  priceGBPPence,
  firstImage,
  CHECKOUT_MAP_PATH
} from './lib/catalog.mjs';

const errors = [];
const catalog = await loadCatalog();
const listed = catalog.filter(isListedForSale);

const seen = new Map();
for (const product of listed) {
  const slug = canonicalSlug(product);
  const label = product.name || product.title || slug || '(unnamed)';

  if (!slug) {
    errors.push(`"${label}" is listed for sale but has no usable slug`);
    continue;
  }
  if (seen.has(slug)) {
    errors.push(`slug "${slug}" is used by more than one listed product`);
  }
  seen.set(slug, product);

  if (!priceGBPPence(product)) {
    errors.push(`"${slug}" is listed for sale but has no GBP price, so it cannot be bought`);
  }
  if (!firstImage(product)) {
    errors.push(`"${slug}" is listed for sale but has no image`);
  }
  if (!(product.name || product.title)) {
    errors.push(`"${slug}" is listed for sale but has no name`);
  }
}

// The committed map must equal what the generator would produce right now.
const expected = buildCheckoutMap(catalog);
let actual = null;
try {
  actual = JSON.parse(await readFile(CHECKOUT_MAP_PATH, 'utf8'));
} catch (err) {
  errors.push(`could not read the checkout price map: ${err.message}`);
}

if (Array.isArray(actual)) {
  const expectedById = new Map(expected.map((e) => [e.id, e]));
  const actualById = new Map(actual.map((e) => [e.id, e]));

  for (const id of expectedById.keys()) {
    if (!actualById.has(id)) {
      errors.push(`"${id}" is listed for sale but is missing from the checkout price map`);
    }
  }
  for (const id of actualById.keys()) {
    if (!expectedById.has(id)) {
      errors.push(`"${id}" is in the checkout price map but is not a listed product`);
    }
  }
  for (const [id, want] of expectedById) {
    const got = actualById.get(id);
    if (got && got.priceGBP !== want.priceGBP) {
      errors.push(
        `"${id}" price drift: catalog says ${want.priceGBP}p, checkout map says ${got.priceGBP}p`
      );
    }
  }
}

if (errors.length) {
  console.error(`Catalog verification FAILED with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nRun: npm run build:catalog');
  process.exit(1);
}

console.log(`Catalog verification passed: ${listed.length} listed products, all buyable.`);
