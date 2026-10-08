#!/usr/bin/env node
/**
 * Keep the hand-built product pages in shop/*.html in step with
 * data/catalogue.json. Each page carries an inline list of variants (size,
 * Printful variant id, price) and a Product structured-data block; both are
 * rewritten from the catalogue so the page shows the price checkout charges.
 * Each page also gets the house runtime, so a resting sign's page cannot be
 * bought from.
 *
 *   node scripts/sync-static-pages.mjs          rewrite pages
 *   node scripts/sync-static-pages.mjs --check  fail if any page has drifted
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadCatalogue, REPO_ROOT } from './lib/catalog.mjs';

const SHOP_DIR = path.join(REPO_ROOT, 'shop');

function variantsBlock(product) {
  const lines = product.variants.map((v) =>
    `      { size: '${v.size}', variantId: '${v.printful_variant_id}', price: ${v.price_gbp.toFixed(2)} }`
  );
  return `const variants = [\n${lines.join(',\n')}\n    ];`;
}

export function pageSlug(html) {
  const m = html.match(/\bslug: '([^']+)'/);
  return m ? m[1] : null;
}

export function syncPage(html, product) {
  let out = html.replace(/const variants = \[[\s\S]*?\n\s*\];/, variantsBlock(product));
  // Size dropdown labels ("M - $46.99"): "$" plus the GBP amount is the
  // site's price token, which js/main.js shows in the shopper's currency.
  for (const v of product.variants) {
    const id = v.printful_variant_id;
    out = out.replace(
      new RegExp(`(<option value="${id}"[^>]*>)([^<]*?) - \\$[0-9.]+(</option>)`),
      `$1$2 - $$${v.price_gbp.toFixed(2)}$3`
    );
  }
  // Structured data: GBP, the lowest variant price, availability from listing.
  out = out.replace(/("@type":\s*"Offer",[\s\S]*?"priceCurrency":\s*)"[A-Z]{3}"/, '$1"GBP"');
  out = out.replace(/("@type":\s*"Offer",[\s\S]*?"price":\s*)"[0-9.]+"/, `$1"${product.price_gbp.min.toFixed(2)}"`);
  if (!out.includes('name="lyrion:product"')) {
    out = out.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  <meta name="lyrion:product" content="${product.slug}">`);
  }
  if (!out.includes('/css/house.css')) {
    out = out.replace('<link rel="stylesheet" href="/css/restoration.css">', '<link rel="stylesheet" href="/css/restoration.css">\n  <link rel="stylesheet" href="/css/house.css">');
  }
  if (!out.includes('/js/house-pdp.js')) {
    out = out.replace('</body>', '<script src="/js/house.js"></script>\n<script src="/js/house-pdp.js"></script>\n</body>');
  }
  return out;
}

export async function checkStaticPages(catalogue) {
  const bySlug = new Map(catalogue.products.map((p) => [p.slug, p]));
  const problems = [];
  const updates = [];
  for (const file of (await readdir(SHOP_DIR)).filter((f) => f.endsWith('.html')).sort()) {
    const full = path.join(SHOP_DIR, file);
    const html = await readFile(full, 'utf8');
    const slug = pageSlug(html);
    const product = slug && bySlug.get(slug);
    if (!product) {
      problems.push(`shop/${file} sells "${slug}", which is not a product in data/catalogue.json`);
      continue;
    }
    if (product.link !== `/shop/${file}`) {
      problems.push(`shop/${file} sells "${slug}" but the catalogue links that product to ${product.link}`);
    }
    const next = syncPage(html, product);
    if (next !== html) {
      problems.push(`shop/${file} differs from the catalogue (prices, variant ids, structured data or house scripts)`);
      updates.push([full, next]);
    }
  }
  return { problems, updates };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const catalogue = await loadCatalogue();
  const { problems, updates } = await checkStaticPages(catalogue);
  if (check) {
    if (problems.length) {
      console.error('Static product pages are out of step with the catalogue:');
      problems.forEach((p) => console.error(`  - ${p}`));
      console.error('\nRun: node scripts/sync-static-pages.mjs');
      process.exit(1);
    }
    console.log('Static product pages match the catalogue.');
  } else {
    for (const [file, html] of updates) await writeFile(file, html, 'utf8');
    const hard = problems.filter((p) => !p.includes('differs from the catalogue'));
    hard.forEach((p) => console.error(`  - ${p}`));
    console.log(`Updated ${updates.length} static product page(s).`);
    if (hard.length) process.exit(1);
  }
}
