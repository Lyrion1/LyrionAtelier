#!/usr/bin/env node
/**
 * Fetch Printful sync products (with variants + mockups) and write data/all-products.json
 */
const fs = require('fs');
const path = require('path');

const token = process.env.PRINTFUL_API_KEY;
if (!token) {
  console.error('PRINTFUL_API_KEY is not configured.');
  process.exit(1);
}

const OUT_FILE = path.join(process.cwd(), 'data', 'all-products.json');
const HEADERS = { Authorization: `Bearer ${token}` };
const LIMIT = 100;
const DISCONTINUED = 'discontinued';
const DEFAULT_CURRENCY = 'USD';
// Whole-number values at or above this are treated as cents; adjust if catalog ever has $1000+ items.
const PRICE_CENTS_THRESHOLD = 1000;
const fetchFn = async (...args) => {
  if (typeof fetch === 'function') return fetch(...args);
  const { default: fetchImport } = await import('node-fetch');
  return fetchImport(...args);
};

const normalizePrice = (raw) => {
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  const isWhole = num % 1 === 0;
  const treatAsCents = isWhole && num >= PRICE_CENTS_THRESHOLD;
  return treatAsCents ? num / 100 : num;
};

const fetchJson = async (url) => {
  const res = await fetchFn(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
};

(async () => {
  let offset = 0;
  const catalog = [];

  // Collect all sync products
  while (true) {
    const page = await fetchJson(`https://api.printful.com/sync/products?limit=${LIMIT}&offset=${offset}`);
    const items = page?.result || [];
    catalog.push(...items);
    const total = page?.paging?.total || items.length;
    offset += items.length;
    if (offset >= total || !items.length) break;
  }

  const detailed = [];
  for (const item of catalog) {
    const id = item?.id || item?.product_id || item?.sync_product?.id;
    if (!id) {
      console.warn('[sync-printful] Skipping product with missing id', item?.external_id || item?.name || '');
      continue;
    }
    try {
      const detail = await fetchJson(`https://api.printful.com/sync/products/${id}`);
      const base = detail?.result?.sync_product || item.sync_product || item;
      const variants = detail?.result?.sync_variants || item.sync_variants || [];
      detailed.push({
        sync_product_id: base?.id ?? id,
        external_id: base?.external_id ?? null,
        name: base?.name || base?.title || '',
        title: base?.name || base?.title || '',
        thumbnail_url: base?.thumbnail_url || base?.thumbnail || null,
        preview_url: base?.preview_url || base?.thumbnail_url || null,
        files: detail?.result?.files || base?.files || [],
        sync_variants: variants.map((v) => {
          const retail = v?.retail_price ?? v?.price ?? null;
          return {
            id: v?.id ?? v?.variant_id ?? null,
            variant_id: v?.id ?? v?.variant_id ?? null,
            name: v?.name || v?.title || '',
            retail_price: retail,
            price: normalizePrice(retail),
            currency: v?.currency || DEFAULT_CURRENCY,
            sku: v?.sku || v?.external_sku || null,
            files: Array.isArray(v?.files) ? v.files : [],
            options: v?.options || {},
            in_stock: v?.in_stock ?? v?.availability !== DISCONTINUED
          };
        })
      });
    } catch (err) {
      console.error(`Failed to fetch product ${id}: ${err?.message || err}`);
    }
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(detailed, null, 2));
  console.log(`Saved ${detailed.length} products to ${OUT_FILE}`);
})();
