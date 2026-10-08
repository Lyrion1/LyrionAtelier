#!/usr/bin/env node
/**
 * Snapshot the Printful store's sync products and variants into
 * data/printful-sync.json. CI checks every Printful variant id in
 * data/catalogue.json against this snapshot, so a product can never be sold
 * with a variant Printful does not have.
 *
 * It no longer writes the product list itself: data/catalogue.json is the one
 * list of products, and overwriting it with raw Printful data would undo
 * every price, image and description in it.
 */
const fs = require('fs');
const path = require('path');

const token = process.env.PRINTFUL_API_KEY;
if (!token) {
  console.error('PRINTFUL_API_KEY is not configured.');
  process.exit(1);
}

const OUT_FILE = path.join(process.cwd(), 'data', 'printful-sync.json');
const HEADERS = { Authorization: `Bearer ${token}` };
if (process.env.PRINTFUL_STORE_ID) HEADERS['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
const LIMIT = 100;

const fetchJson = async (url) => {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
};

(async () => {
  const list = [];
  for (let offset = 0; ; ) {
    const page = await fetchJson(`https://api.printful.com/sync/products?limit=${LIMIT}&offset=${offset}`);
    const items = page?.result || [];
    list.push(...items);
    offset += items.length;
    if (!items.length || offset >= (page?.paging?.total ?? offset)) break;
  }

  const products = [];
  for (const item of list) {
    const detail = await fetchJson(`https://api.printful.com/sync/products/${item.id}`);
    const sp = detail?.result?.sync_product || item;
    products.push({
      id: sp.id,
      external_id: sp.external_id ?? null,
      name: sp.name,
      sync_variants: (detail?.result?.sync_variants || []).map((v) => ({
        id: v.id,
        external_id: v.external_id ?? null,
        variant_id: v.variant_id ?? null,
        name: v.name,
        sku: v.sku ?? null,
        size: v.size ?? null,
        color: v.color ?? null,
        retail_price: v.retail_price ?? null,
        currency: v.currency ?? null,
        availability_status: v.availability_status ?? null,
      })),
    });
  }

  const snapshot = { fetched_at: new Date().toISOString(), products };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Saved ${products.length} Printful sync products to data/printful-sync.json`);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
