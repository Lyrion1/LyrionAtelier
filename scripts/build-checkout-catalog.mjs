#!/usr/bin/env node
/**
 * Generate public/data/products.json, the price map the checkout Edge
 * Function reads, from data/catalogue.json.
 *
 * Slugs, prices and Printful variant ids are written down exactly once, in
 * the catalogue. This makes the checkout map a pure derivative, so a product
 * can never be listed on the site with a slug that checkout has never heard of.
 */
import { writeFile } from 'node:fs/promises';
import { loadCatalogue, validateCatalogue, buildCheckoutMap, CHECKOUT_MAP_PATH } from './lib/catalog.mjs';

const catalogue = await loadCatalogue();
const errors = validateCatalogue(catalogue);
if (errors.length) {
  console.error('Refusing to write a checkout map from an invalid catalogue:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const map = buildCheckoutMap(catalogue);
await writeFile(CHECKOUT_MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
console.log(`Wrote ${map.length} products to public/data/products.json`);
