/**
 * Shared catalog rules. This is the ONE place that knows how a product's
 * slug and its canonical price are derived. The site catalog, the generated
 * checkout price map, and the verifier all import from here so a slug or a
 * price rule is never written down twice.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');

export const CATALOG_PATH = path.join(REPO_ROOT, 'data', 'all-products.json');
export const CHECKOUT_MAP_PATH = path.join(REPO_ROOT, 'public', 'data', 'products.json');

/** The store settles in GBP: Stripe charges GBP and prices are stored in GBP. */
export const BASE_CURRENCY = 'GBP';

/**
 * Canonical slug for a product. Every consumer calls this rather than
 * reaching for `.slug` or `.id` directly, so the cart, the product page and
 * the checkout map can never disagree about what a product is called.
 */
export function canonicalSlug(product = {}) {
  const explicit = typeof product.slug === 'string' ? product.slug.trim() : '';
  if (explicit) return explicit;
  const id = product.id == null ? '' : String(product.id).trim();
  if (id) return id;
  const title = product.title || product.name || '';
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** A product is offered for sale only when it is both published and ready. */
export function isListedForSale(product = {}) {
  const state = product.state || {};
  return Boolean(state.published && state.ready);
}

/**
 * Round a converted amount to a retail-looking figure rather than leaving the
 * raw output of a multiplication (50.6153) on a price tag. Nearest whole unit,
 * then one penny below it, so everything lands on a .99 ending.
 */
export function retailRound(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0.99, Math.round(n) - 0.01);
}

/**
 * Canonical price in GBP pence, the integer Stripe is charged.
 * Some products price as a range rather than a single figure; the base
 * (smallest) price is the one shown on the card and the product page, so
 * that is the one checkout has to agree with.
 */
export function priceGBPPence(product = {}) {
  const candidates = [
    product.priceGBP != null ? Number(product.priceGBP) / 100 : null,
    typeof product.price === 'number' ? product.price : null,
    product.price && typeof product.price === 'object' ? Number(product.price.min) : null,
    product.price_range && typeof product.price_range === 'object'
      ? Number(product.price_range.min)
      : null
  ];
  for (const value of candidates) {
    if (Number.isFinite(value) && value > 0) return Math.round(value * 100);
  }
  return null;
}

export function firstImage(product = {}) {
  if (typeof product.mainImage === 'string' && product.mainImage) return product.mainImage;
  if (Array.isArray(product.images) && product.images.length) return product.images[0];
  if (typeof product.image === 'string' && product.image) return product.image;
  return '';
}

export function productSizes(product = {}) {
  const opts = product.options || {};
  const fromOptions = []
    .concat(Array.isArray(opts.size) ? opts.size : [])
    .concat(Array.isArray(opts.sizes) ? opts.sizes : []);
  const fromVariants = (Array.isArray(product.variants) ? product.variants : [])
    .map((v) => v?.options?.size ?? v?.size)
    .filter(Boolean);
  return Array.from(new Set([...fromOptions, ...fromVariants].filter(Boolean)));
}

export function printfulVariantIds(product = {}) {
  const ids = (Array.isArray(product.variants) ? product.variants : [])
    .map((v) => v?.printfulVariantId || v?.printful_variant_id || v?.variant_id || null)
    .filter(Boolean);
  return ids.length ? ids : undefined;
}

export async function loadCatalog() {
  const raw = await readFile(CATALOG_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('data/all-products.json must be an array');
  return data;
}

/** The exact shape the checkout Edge Function consumes. */
export function toCheckoutEntry(product) {
  const entry = {
    id: canonicalSlug(product),
    name: product.name || product.title || canonicalSlug(product),
    priceGBP: priceGBPPence(product),
    image: firstImage(product)
  };
  const sizes = productSizes(product);
  if (sizes.length) entry.sizes = sizes;
  const pf = printfulVariantIds(product);
  if (pf) entry.printfulVariantId = pf;
  return entry;
}

export function buildCheckoutMap(catalog) {
  return catalog.filter(isListedForSale).map(toCheckoutEntry);
}
