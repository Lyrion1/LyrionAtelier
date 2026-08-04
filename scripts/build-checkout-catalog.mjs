#!/usr/bin/env node
/**
 * Generate public/data/products.json (the price map the checkout Edge
 * Function reads) from data/all-products.json (the catalog the site renders
 * from).
 *
 * The point is that slugs and prices are written down exactly once, in the
 * catalog. Running this makes the checkout map a pure derivative, so a
 * product can never be listed on the site with a slug that checkout has
 * never heard of.
 */
import { writeFile } from 'node:fs/promises';
import { loadCatalog, buildCheckoutMap, CHECKOUT_MAP_PATH } from './lib/catalog.mjs';

const catalog = await loadCatalog();
const map = buildCheckoutMap(catalog);

const missingPrice = map.filter((e) => !e.priceGBP);
if (missingPrice.length) {
  console.error('Refusing to write a checkout map with unpriced products:');
  for (const e of missingPrice) console.error(`  ${e.id}`);
  process.exit(1);
}

await writeFile(CHECKOUT_MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
console.log(`Wrote ${map.length} products to public/data/products.json`);
